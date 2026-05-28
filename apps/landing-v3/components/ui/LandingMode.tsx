"use client";

import { useEffect } from "react";

// Adds `landing-mode` to <html> while the landing page is mounted.
// Routes that need natural scroll (/methodology, /audit/[id]) don't
// render this, so the @media (min-width:901px) viewport lock in
// globals.css stays off there. Also gates the cursor-spotlight
// body::after gradient to the landing.
//
// Toggled in useEffect (client-only) — there's a one-frame gap on
// initial load before the class is added, which is invisible because
// the landing's content already fits the viewport at the resting size.

export default function LandingMode() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("landing-mode");
    return () => {
      html.classList.remove("landing-mode");
    };
  }, []);
  return null;
}
