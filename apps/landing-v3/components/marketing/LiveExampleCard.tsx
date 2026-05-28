"use client";

import { useEffect, useState } from "react";

// Aurum Spa Aesthetics fixture per §4, re-skinned as an editorial tear-sheet
// (docs/Design/m3-tearsheet-variant.html). The macOS browser chrome from the
// first M3 build is gone; the card now sits on a kraft-shifted paper field
// between two ink hairline rules, with a magazine dateline and a serial-
// number folio replacing the URL bar.
//
// Entrance choreography (tied to the page-load orchestration in
// HeroLanding): the wrapper carries the card-tilt-in keyframe (starts
// 580ms, runs 780ms, lands at ~1360ms). The score counts up 0 → 46 starting
// at the moment the wrapper lands, and the mini-grid rows fade-stagger
// right after.

const SCORE_START_DELAY_MS = 1360;
const SCORE_DURATION_MS = 720;

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useScoreCountUp(target: number, startDelayMs: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    let startTs = 0;
    let timeout = 0 as unknown as ReturnType<typeof setTimeout>;

    function step(ts: number) {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const t = Math.min(1, elapsed / SCORE_DURATION_MS);
      const next = Math.round(target * easeOutExpo(t));
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    }

    timeout = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, startDelayMs);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, startDelayMs]);

  return value;
}

interface MiniGridRow {
  query: string;
  marks: Array<"g" | "y" | "r" | "n">;
}

const FIXTURE = {
  bizName: "Aurum Spa Aesthetics",
  category: "Med Spa",
  location: "Beverly Hills, CA",
  score: 46,
  verdict: "Partially visible to AI.",
  verdictDetail:
    "Named by ChatGPT, Perplexity, and Claude across most queries; missed by Gemini in the high-intent slot.",
  audited: 5,
  rows: [
    { query: "Best med spa Beverly Hills", marks: ["y", "y", "y", "n", "y"] },
    { query: "Top Botox injector Beverly Hills", marks: ["y", "y", "y", "r", "g"] },
    { query: "Best Morpheus8 Los Angeles", marks: ["y", "y", "y", "r", "g"] },
  ] satisfies MiniGridRow[],
} as const;

const MARK_BG: Record<"g" | "y" | "r" | "n", string> = {
  g: "bg-green",
  y: "bg-amber",
  r: "bg-red",
  n: "bg-line-strong",
};

const LLM_COLS = ["ChatG…", "Perple…", "Claude", "Gemini", "Grok"];

export default function LiveExampleCard() {
  const displayedScore = useScoreCountUp(FIXTURE.score, SCORE_START_DELAY_MS);

  return (
    <article
      aria-label={`Live audit tear-sheet for ${FIXTURE.bizName}: score ${FIXTURE.score} out of 100. ${FIXTURE.verdict}`}
      className="relative w-full max-w-[580px] border-y border-ink bg-bg-paper px-11 pb-9 pt-8 max-[520px]:px-6 max-[520px]:pb-7 max-[520px]:pt-6"
    >
      {/* Folio: serial-number anchor in Instrument Serif italic. Magazine
          cornerstone that replaces the macOS traffic-light chrome. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-7 top-4 select-none font-serif text-[56px] italic leading-[0.9] text-line-strong max-[520px]:right-4 max-[520px]:top-3 max-[520px]:text-[38px]"
      >
        01
      </div>

      {/* Dateline replaces the URL bar. The pulse dot remains as the one
          live-state signal. */}
      <div className="mb-[26px] flex items-baseline justify-between gap-4 border-b border-line-strong pb-[18px] font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
        <span className="inline-flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 flex-shrink-0 animate-eyebrow-pulse rounded-full bg-coral"
          />
          GeoTracker · Audit Series · May 2026
        </span>
        <span className="text-ink-3">No. 01</span>
      </div>

      {/* Lead: business identifier + Instrument Serif italic deck. The
          verdict lives in the deck as an editorial pull-quote — the same
          role it carried as a coral label below the score in the prior
          treatment, now doing more work as a typeset deck above it. */}
      <h2 className="mb-1.5 text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-ink max-[520px]:text-[24px]">
        {FIXTURE.bizName}
      </h2>
      <div className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">
        {FIXTURE.category} · {FIXTURE.location}
      </div>
      <p
        className="mb-[22px] max-w-[460px] font-serif text-[26px] italic leading-[1.18] tracking-[-0.005em] text-ink max-[520px]:text-[22px]"
      >
        Scored{" "}
        <span className="text-coral-deep">
          {displayedScore} out of 100.
        </span>{" "}
        {FIXTURE.verdict} <span className="text-ink-2">{FIXTURE.verdictDetail}</span>
      </p>

      {/* Score row: hairline-bounded stat insert. Number left, label right —
          flat-page composition instead of the centered hero-metric stack. */}
      <div className="mb-[26px] flex items-baseline gap-[18px] border-y border-line-strong py-5">
        <span className="text-[72px] font-bold leading-[0.9] tracking-[-0.04em] text-ink tabular-nums max-[520px]:text-[56px]">
          {displayedScore}
        </span>
        <span className="font-mono text-[14px] tracking-[0.04em] text-ink-3">/ 100</span>
        <span className="ml-auto text-right font-mono text-[10px] uppercase leading-[1.5] tracking-[0.16em] text-ink-2">
          Visibility score
          <br />
          {FIXTURE.audited} engines · {FIXTURE.rows.length} queries
        </span>
      </div>

      {/* Grid: kept structurally, with the chrome rules above doing the
          framing the browser-bar used to do. */}
      <table className="mb-[22px] w-full border-collapse text-[12px] max-[520px]:text-[11px]">
        <thead>
          <tr>
            <th className="border-b border-line py-2 pl-[2px] pr-1 text-left font-mono text-[9px] font-medium uppercase tracking-[0.04em] text-ink-3 max-[520px]:text-[8px]" />
            {LLM_COLS.map((label) => (
              <th
                key={label}
                className="border-b border-line p-2 text-center font-mono text-[9px] font-medium uppercase tracking-[0.04em] text-ink-3 max-[520px]:p-[7px] max-[520px]:text-[8px]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIXTURE.rows.map((row, i) => (
            <tr
              key={row.query}
              // Rows fade in one-by-one starting ~140ms after the score
              // count begins, mirroring the prior treatment's choreography.
              className="motion-safe:animate-enter-fade"
              style={{ animationDelay: `${1500 + i * 120}ms` }}
            >
              <td
                className={`max-w-[160px] py-2 pl-[2px] pr-1 text-left font-medium text-ink ${
                  i === FIXTURE.rows.length - 1 ? "border-b-0" : "border-b border-line"
                }`}
              >
                {row.query}
              </td>
              {row.marks.map((mark, j) => (
                <td
                  key={j}
                  className={`p-2 text-center max-[520px]:p-[7px] ${
                    i === FIXTURE.rows.length - 1 ? "border-b-0" : "border-b border-line"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${MARK_BG[mark]}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sign-off: italic Instrument Serif at 18px replaces the bold coral
          sans CTA. The voice now matches the deck, so the link reads as
          editorial sign-off rather than a SaaS button. */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line-strong pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
          Audited 2026-05-28 · Free, no email
        </span>
        <a
          href="#audit-form"
          className="inline-flex items-baseline gap-1.5 font-serif text-[18px] italic text-coral no-underline transition-[gap] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:gap-2.5"
        >
          Try your own <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}
