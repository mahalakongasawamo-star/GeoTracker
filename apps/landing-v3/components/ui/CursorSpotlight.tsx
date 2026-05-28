"use client";

import { useEffect } from "react";

// Writes --mx / --my onto <body> so the body::after radial gradient
// (defined in globals.css) tracks the cursor. Gated below 900px via the
// CSS @media block, so this listener can also short-circuit early there
// to keep the bundle quiet.

export default function CursorSpotlight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 900px)").matches) return;

    const onMove = (e: MouseEvent) => {
      document.body.style.setProperty("--mx", `${e.clientX}px`);
      document.body.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return null;
}
