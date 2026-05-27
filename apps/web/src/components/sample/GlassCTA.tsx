import { track } from "../../lib/analytics";

// Bottom CTA, reuses the SolutionPitch copy but rendered as a glass card
// over the gradient mesh. Fires the same consultation_booked event with a
// source discriminator so we can compare per-landing conversion.

export default function GlassCTA() {
  return (
    <section className="px-6 pb-24 pt-10">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-brand-700/95 via-brand-600/95 to-brand-500/95 p-10 text-white shadow-[0_30px_80px_-20px_rgba(11,108,186,0.5)] backdrop-blur-2xl sm:p-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5), transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.35), transparent 45%)",
          }}
        />
        <div className="relative">
          <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/30">
            Upserv — the full-service path
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            DIY tools give you a template.
            <br />
            <span className="text-white/85">Upserv gives you a team.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-white/85">
            Hosting, AEO-optimized FAQs, 500+ pages of authority content, and a
            human content team that hunts down red Xs every month — until every
            engine recommends you, not your competitor.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#book"
              onClick={() => track("consultation_booked", { source: "sample_landing" })}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-brand-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Book a free consultation
              <span className="transition group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="#pulse"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/20"
            >
              Send me a monthly Pulse Report
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
