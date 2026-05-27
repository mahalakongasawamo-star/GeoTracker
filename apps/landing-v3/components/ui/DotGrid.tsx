// Fixed-position SVG dot grid with a radial fade mask + coral wash behind
// it. Rendered once at the page root (NOT per-section) per §4. Sized to
// stay off-screen on mobile and dominant on desktop.

export default function DotGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 75% 50%, var(--coral-soft), transparent 65%)",
        }}
      />
      <svg
        className="floating-el absolute top-1/2 right-[-8%] h-[1100px] w-[1100px] -translate-y-1/2 opacity-[0.35] max-[900px]:h-[700px] max-[900px]:w-[700px] max-[900px]:right-[-30%] max-[900px]:top-[40%] max-[900px]:opacity-20"
        viewBox="0 0 800 800"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        data-depth="1.5"
        data-preserve-transform="translate(0, -50%)"
      >
        <defs>
          <pattern id="dotPattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="1.6" fill="#a8a094" />
          </pattern>
          <radialGradient id="dotFadeMask" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="dotMask">
            <rect width="800" height="800" fill="url(#dotFadeMask)" />
          </mask>
        </defs>
        <rect width="800" height="800" fill="url(#dotPattern)" mask="url(#dotMask)" />
      </svg>
    </div>
  );
}
