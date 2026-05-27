"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMousePositionRef } from "@/hooks/use-mouse-position-ref";
import { cn } from "@/lib/utils";

// Ported from the §5 motion spec in GEOTRACKER_DESIGN_REVISION.md:
//   strength = (depth * sensitivity) / 20
//   targetX  = mouseX * strength
//   currentX += (targetX - currentX) * easing
//
// One rAF loop in <Floating> ticks every registered <FloatingElement>.
// Children register themselves on mount and write directly to their own
// `transform` from the loop — no per-frame React render. Disabled below
// 900px (no cursor, just battery drain) and under prefers-reduced-motion.

const MOBILE_BREAKPOINT = 900;

interface RegisteredElement {
  el: HTMLElement;
  depth: number;
  preserveTransform: string;
  x: number;
  y: number;
}

interface FloatingContextValue {
  register: (el: HTMLElement, depth: number, preserveTransform: string) => () => void;
}

const FloatingContext = createContext<FloatingContextValue | null>(null);

export interface FloatingProps extends HTMLAttributes<HTMLDivElement> {
  /** Master strength multiplier. Higher = elements drift further per pixel of cursor travel. */
  sensitivity?: number;
  /** Lerp factor in [0,1]. Lower = lazier follow. */
  easingFactor?: number;
  children: ReactNode;
}

export function Floating({
  sensitivity = 2.2,
  easingFactor = 0.05,
  className,
  children,
  ...rest
}: FloatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useMousePositionRef();
  const elementsRef = useRef<RegisteredElement[]>([]);

  const register = useMemo<FloatingContextValue["register"]>(
    () => (el, depth, preserveTransform) => {
      const entry: RegisteredElement = { el, depth, preserveTransform, x: 0, y: 0 };
      elementsRef.current.push(entry);
      return () => {
        const idx = elementsRef.current.indexOf(entry);
        if (idx >= 0) elementsRef.current.splice(idx, 1);
      };
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let alive = true;

    function tick() {
      if (!alive) return;
      if (!mql.matches && !reduced.matches) {
        const { x: mx, y: my } = mouse.current ?? { x: 0, y: 0 };
        for (const entry of elementsRef.current) {
          const strength = (entry.depth * sensitivity) / 20;
          const targetX = mx * strength;
          const targetY = my * strength;
          entry.x += (targetX - entry.x) * easingFactor;
          entry.y += (targetY - entry.y) * easingFactor;
          entry.el.style.transform = `translate3d(${entry.x.toFixed(2)}px, ${entry.y.toFixed(2)}px, 0) ${entry.preserveTransform}`;
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [sensitivity, easingFactor, mouse]);

  return (
    <FloatingContext.Provider value={{ register }}>
      <div ref={containerRef} className={cn("relative", className)} {...rest}>
        {children}
      </div>
    </FloatingContext.Provider>
  );
}

export interface FloatingElementProps {
  /** Higher depth = stronger parallax. Spec range: 1 (foreground) — 3 (background). */
  depth?: number;
  /** Any CSS transform fragment that must survive the parallax translate
   *  (e.g. `rotate(45deg)` on the brand mark). */
  preserveTransform?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactElement;
}

export function FloatingElement({
  depth = 1,
  preserveTransform = "",
  className,
  style,
  children,
}: FloatingElementProps) {
  const ctx = useContext(FloatingContext);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ctx || !ref.current) return;
    return ctx.register(ref.current, depth, preserveTransform);
  }, [ctx, depth, preserveTransform]);

  const only = Children.only(children);
  if (!isValidElement(only)) return only;

  const merged = cn("floating-el", (only.props as { className?: string }).className, className);
  return cloneElement(only, {
    ref: (node: HTMLElement | null) => {
      ref.current = node;
      // Re-apply the preserve transform on first mount so the element
      // doesn't snap to (0,0) before the first tick lands.
      if (node) node.style.transform = `translate3d(0,0,0) ${preserveTransform}`;
      // Pass-through ref
      const childRef = (only as ReactElement & { ref?: unknown }).ref;
      if (typeof childRef === "function") childRef(node);
      else if (childRef && typeof childRef === "object")
        (childRef as { current: HTMLElement | null }).current = node;
    },
    className: merged,
    style: {
      ...((only.props as { style?: CSSProperties }).style ?? {}),
      ...style,
      willChange: "transform",
    },
  } as Partial<typeof only.props>);
}
