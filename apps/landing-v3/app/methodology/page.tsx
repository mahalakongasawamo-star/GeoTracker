import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How we score — GeoTracker",
  description:
    "Five AI engines, the questions a customer would ask, a score from 0 to 100. Here is what the audit actually does when you enter your domain.",
};

// Methodology page reachable from HeroLanding's trust strip. Second-pass
// readers (agency consultants, marketing managers) bounce on a free-audit
// landing that has nowhere to scroll into for proof. One quiet page keeps
// the editorial voice and answers the trust questions without expanding the
// landing surface.

const COMMITMENTS = [
  "We don’t ask for your email. The audit is anonymous.",
  "We don’t store the result against an account unless you sign in.",
  "We don’t sell your domain or audit data to anyone.",
  "We don’t upsell during the audit. The product is free to use.",
];

interface MethodologySection {
  step: string;
  title: string;
  body: string;
}

const SECTIONS: MethodologySection[] = [
  {
    step: "One",
    title: "What we ask",
    body:
      "We send the same questions a customer would type into ChatGPT, Claude, Gemini, Perplexity, and Grok. The questions are category-aware: a dental practice gets best family dentist in [city], a med spa gets best Botox injector in [city]. For each business we fan out across the seed city plus a small ring of adjacent ones, so a med spa in Beverly Hills also gets asked about under Los Angeles and West Hollywood.",
  },
  {
    step: "Two",
    title: "What we count",
    body:
      "For every answer, we record whether the business was named, where it ranked, and whether the answer included a phone number or website. A business named in the top three with contact info is a hit. A business named but with no contact info is a soft hit. A business ranked below three is a caveat. A business not mentioned at all is a miss.",
  },
  {
    step: "Three",
    title: "The score",
    body:
      "The number you see is a rolled-up visibility score across the matrix of LLM, question, and city. A 100 means every engine names you in every relevant query, with contact info. A 0 means you don’t appear. Most real businesses land between 30 and 60; the bands are deliberately tough. The audit takes around twelve seconds because every question runs in parallel; we don’t ask the engines to look anything up, we read what they already know.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-bg px-6 py-14 max-[720px]:py-10">
      <div className="mx-auto max-w-[680px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2 no-underline transition-colors hover:text-coral"
        >
          <span aria-hidden="true">←</span> Back to GeoTracker
        </Link>

        <h1 className="mt-10 mb-4 text-[clamp(30px,4.4vw,52px)] font-bold leading-[1.02] tracking-[-0.03em] text-ink">
          How we{" "}
          <span className="font-serif font-normal italic text-coral">score</span>{" "}
          a business.
        </h1>

        <p className="mb-12 max-w-[560px] text-[17px] leading-[1.55] text-ink-2">
          Skeptical is the right place to start. Here’s what the audit does when
          you enter your domain.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.step} className="mb-10">
            <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 before:h-[7px] before:w-[7px] before:rounded-full before:bg-coral before:content-['']">
              {section.step} · {section.title}
            </div>
            <p className="text-[15px] leading-[1.6] text-ink-2">{section.body}</p>
          </section>
        ))}

        <section className="mb-10 border-t border-line pt-8">
          <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 before:h-[7px] before:w-[7px] before:rounded-full before:bg-coral before:content-['']">
            What we don’t do
          </div>
          <ul className="space-y-2.5 text-[15px] leading-[1.55] text-ink-2">
            {COMMITMENTS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="border-t border-line pt-8">
          <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 before:h-[7px] before:w-[7px] before:rounded-full before:bg-coral before:content-['']">
            Pulse Report
          </div>
          <p className="text-[15px] leading-[1.6] text-ink-2">
            If you give us an email after the audit, we’ll send a monthly Pulse
            Report: the same audit, run automatically, with deltas against the
            last run. Unsubscribe from the first email if you don’t want it.
          </p>
        </section>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 max-[720px]:text-[10px]">
          <div>
            © 2026 GeoTracker · A product by{" "}
            <span className="text-coral">Iozera</span>
          </div>
          <Link
            href="/"
            className="text-ink-2 no-underline transition-colors hover:text-coral"
          >
            Run an audit <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
