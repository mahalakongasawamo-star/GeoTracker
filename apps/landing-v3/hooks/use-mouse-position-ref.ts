"use client";

import { useEffect, useRef, type RefObject } from "react";

// Returns a ref whose .current = { x, y } is the cursor offset from the
// center of the supplied container (or the viewport when none is given).
// A ref — not state — because parallax tickers read this from a
// requestAnimationFrame loop where re-rendering on every mousemove would
// be catastrophic.

export interface MousePosition {
  x: number;
  y: number;
}

export function useMousePositionRef(
  containerRef?: RefObject<HTMLElement | null>,
): RefObject<MousePosition> {
  const ref = useRef<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    function handleMove(e: MouseEvent | TouchEvent) {
      const point =
        "touches" in e
          ? e.touches[0]
          : (e as MouseEvent);
      if (!point) return;
      const node = containerRef?.current;
      if (node) {
        const rect = node.getBoundingClientRect();
        ref.current.x = point.clientX - (rect.left + rect.width / 2);
        ref.current.y = point.clientY - (rect.top + rect.height / 2);
      } else {
        ref.current.x = point.clientX - window.innerWidth / 2;
        ref.current.y = point.clientY - window.innerHeight / 2;
      }
    }

    function handleLeave() {
      // Glide back to center when the cursor leaves the window. Matches the
      // vanilla mockup behavior.
      ref.current.x = 0;
      ref.current.y = 0;
    }

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
    };
  }, [containerRef]);

  return ref;
}
