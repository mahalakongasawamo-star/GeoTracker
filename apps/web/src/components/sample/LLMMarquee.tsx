import { LLM_DISPLAY, LLM_PROVIDERS } from "@geotracker/shared";
import { PROVIDER_MARKS } from "./logos/ProviderLogos";

// Infinite-scroll strip. The track is rendered twice; the second copy is
// `aria-hidden` so SR users only hear the providers once. CSS keyframe
// (defined in tailwind.config) translates the track by -50% so the loop
// joins seamlessly.

export default function LLMMarquee() {
  const items = LLM_PROVIDERS;
  return (
    <section className="relative py-12">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        We ask the real engines, on every audit
      </p>
      <div className="group relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max gap-12 motion-safe:animate-marquee motion-safe:group-hover:[animation-play-state:paused]">
          {[...items, ...items].map((p, i) => {
            const Mark = PROVIDER_MARKS[p];
            return (
              <div
                key={`${p}-${i}`}
                aria-hidden={i >= items.length ? "true" : undefined}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/50 bg-white/50 px-6 py-3 text-slate-800 shadow-glass backdrop-blur-md"
              >
                <Mark className="h-6 w-6 text-slate-700" />
                <span className="text-sm font-semibold">{LLM_DISPLAY[p]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
