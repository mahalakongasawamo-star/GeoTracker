// Fixed full-viewport background. Three big blurred radial blobs drift on a
// 24s loop using CSS keyframes from tailwind.config (mesh-drift). Pure
// presentational — zero JS state. Wraps the rest of the page so all glass
// surfaces have something interesting to refract.

export default function GradientMesh() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-brand-50"
    >
      <div className="absolute -top-32 -left-24 h-[42rem] w-[42rem] rounded-full bg-brand-500/40 blur-3xl motion-safe:animate-mesh-drift" />
      <div className="absolute top-1/3 -right-32 h-[36rem] w-[36rem] rounded-full bg-fuchsia-400/30 blur-3xl motion-safe:animate-mesh-drift-slow" />
      <div className="absolute -bottom-40 left-1/4 h-[40rem] w-[40rem] rounded-full bg-cyan-300/40 blur-3xl motion-safe:animate-mesh-drift" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.6),transparent_60%)]" />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
