import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";
import { Floating, FloatingElement } from "@/components/ui/Floating";
import AuditForm from "./AuditForm";
import LiveExampleCard from "./LiveExampleCard";
import FloatingLLMLogos from "./FloatingLLMLogos";

// The hero of `/`. Composes: status eyebrow, headline, lead, AuditForm,
// sample-link/trust strip, FloatingLLMLogos (decorative), LiveExampleCard.
// One <Floating> ticker drives every <FloatingElement> on the page — brand
// mark, LLM logos, audit-card wrapper.
//
// Page-load orchestration: every element below carries an animate-enter-*
// class with a per-element animation-delay. The stagger reads top-down on
// the pitch column and lands the card last; the FloatingLLMLogos cluster
// fades in alongside the headline (handled in that component).
//
// LLM logos and the brand mark only carry opacity entrances — their
// transforms are owned by the Floating RAF loop and would fight a CSS
// transform keyframe. The LiveExampleCard's entrance lives on a wrapper
// outside the FloatingElement so the card's own tilt-RAF stays clean.

export default function HeroLanding() {
  return (
    <Floating sensitivity={2.2} easingFactor={0.05}>
      {/* Decorative LLM logo cluster — rendered before the shell so they
          sit behind content but above DotGrid (z-index 10 on each). */}
      <FloatingLLMLogos />

      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-14 max-[1100px]:px-8 max-[720px]:px-5">
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between py-[22px] motion-safe:animate-enter-fade max-[720px]:py-4">
          <div className="flex items-center gap-3 text-[17px] font-bold tracking-[-0.01em]">
            <FloatingElement depth={1} preserveTransform="rotate(45deg)">
              <BrandMark className="animate-idle-rotate" />
            </FloatingElement>
            <span>GeoTracker</span>
          </div>
        </header>

        {/* Main split */}
        <main
          id="audit-form"
          className="grid min-h-0 flex-1 grid-cols-2 items-center gap-16 py-6 pb-8 max-[1100px]:gap-10 max-[900px]:grid-cols-1 max-[900px]:items-start max-[900px]:gap-8 max-[900px]:py-4 max-[900px]:pb-8"
        >
          {/* LEFT: pitch + form */}
          <div className="max-w-[620px]">
            <div
              className="mb-[26px] inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-bg-3 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2 motion-safe:animate-enter-up motion-safe:[animation-delay:120ms] max-[720px]:mb-[18px] max-[720px]:px-3 max-[720px]:py-[5px] max-[720px]:text-[10px]"
            >
              <span className="block h-1.5 w-1.5 flex-shrink-0 animate-eyebrow-pulse rounded-full bg-coral" />
              Live in 12 seconds · No signup
            </div>

            <h1
              className="mb-[22px] text-[clamp(34px,4.8vw,68px)] font-bold leading-[0.98] tracking-[-0.035em] text-ink motion-safe:animate-enter-up motion-safe:[animation-delay:220ms] max-[720px]:mb-4 max-[720px]:leading-[1.02]"
            >
              Is your business
              <br />
              <span className="font-serif italic font-normal text-coral">invisible</span> to AI?
            </h1>

            <p
              className="mb-[30px] max-w-[540px] text-[18px] leading-[1.55] text-ink-2 motion-safe:animate-enter-up motion-safe:[animation-delay:340ms] max-[720px]:mb-[22px] max-[720px]:text-[16px] max-[720px]:leading-[1.5]"
            >
              See what the AI engines tell people who ask for the best business in your category,
              in your city.
            </p>

            <div className="motion-safe:animate-enter-up motion-safe:[animation-delay:460ms]">
              <AuditForm />
            </div>

            <div
              className="mt-[26px] flex flex-wrap gap-5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 motion-safe:animate-enter-fade motion-safe:[animation-delay:660ms] max-[720px]:mt-5 max-[720px]:gap-3.5 max-[720px]:text-[10px]"
            >
              <span className="before:mr-1 before:text-coral before:content-['▸']">
                Free monthly Pulse Report
              </span>
              <Link
                href="/methodology"
                className="text-ink-2 no-underline transition-colors before:mr-1 before:text-coral before:content-['▸'] hover:text-coral"
              >
                How we score
              </Link>
            </div>
          </div>

          {/* RIGHT: live example card. Entrance lives here, outside the
              FloatingElement, so the inner card-tilt RAF doesn't fight the
              keyframe transform. */}
          <div className="relative flex items-center justify-center motion-safe:animate-card-tilt-in motion-safe:[animation-delay:580ms]">
            <FloatingElement depth={2.5}>
              <div className="[perspective:1400px] [perspective-origin:center_center]">
                <LiveExampleCard />
              </div>
            </FloatingElement>
          </div>
        </main>

        {/* Footer strip */}
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line py-[14px] pb-[18px] font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 motion-safe:animate-enter-fade motion-safe:[animation-delay:820ms] max-[720px]:py-3 max-[720px]:pb-4 max-[720px]:text-[10px]">
          <div>
            © 2026 GeoTracker · A product by <span className="text-coral">Iozera</span>
          </div>
          <div>Privacy · Terms · Contact</div>
        </div>
      </div>
    </Floating>
  );
}
