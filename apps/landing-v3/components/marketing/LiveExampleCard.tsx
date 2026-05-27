"use client";

import { useEffect, useRef, useState } from "react";

// Aurum Spa Aesthetics fixture per §4. The card-tilt effect (depth-look at
// cursor, max 8°, 420px influence, 0.08 easing) is wired here. Inner
// layers parallax via translateZ in the CSS classes.
//
// Entrance choreography (tied to the page-load orchestration in
// HeroLanding): the card itself rides the outer wrapper's card-tilt-in
// keyframe (starts 580ms, runs 780ms, lands at ~1360ms). The score then
// counts up 0 → 46 starting at the moment the card lands, and the
// mini-grid rows fade-stagger right after.

// Entrance start (page-load anchor + card-tilt-in duration) in ms.
const SCORE_START_DELAY_MS = 1360;
const SCORE_DURATION_MS = 720;

function easeOutExpo(t: number) {
  // Same curve the page-load orchestration uses (cubic-bezier(.16,1,.3,1)).
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
  url: "geotracker.upserv.ai/audits/aurumspa",
  score: 46,
  verdict: "Partially visible to AI",
  audited: 5,
  rows: [
    { query: "Best med spa Beverly Hills",         marks: ["y", "y", "y", "n", "y"] },
    { query: "Top Botox injector Beverly Hills",   marks: ["y", "y", "y", "r", "g"] },
    { query: "Best Morpheus8 Los Angeles",         marks: ["y", "y", "y", "r", "g"] },
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
  const cardRef = useRef<HTMLDivElement>(null);
  const displayedScore = useScoreCountUp(FIXTURE.score, SCORE_START_DELAY_MS);

  // Card tilt (§5 — max 8°, 420px influence, 0.08 easing). Disabled below
  // 900px viewport and under prefers-reduced-motion. Reads cursor position
  // from the global mousemove listener mounted alongside the spotlight.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 900px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = cardRef.current;
    if (!card) return;

    const MAX_ROTATE = 8;
    const INFLUENCE_RADIUS = 420;
    const EASING = 0.08;
    let targetRX = 0;
    let targetRY = 0;
    let currentRX = 0;
    let currentRY = 0;
    let raf = 0;

    card.classList.add("card-tilt-active");

    function onMove(e: MouseEvent) {
      const rect = card!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, Math.min(1, 1 - dist / INFLUENCE_RADIUS));
      targetRY = (dx / INFLUENCE_RADIUS) * MAX_ROTATE * falloff;
      targetRX = -(dy / INFLUENCE_RADIUS) * MAX_ROTATE * falloff;
    }

    function tick() {
      currentRX += (targetRX - currentRX) * EASING;
      currentRY += (targetRY - currentRY) * EASING;
      // Preserve the resting rotate(0.6deg) the card sits at.
      card!.style.transform = `rotate(0.6deg) rotateX(${currentRX.toFixed(2)}deg) rotateY(${currentRY.toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      role="img"
      aria-label={`Live example audit result for ${FIXTURE.bizName}`}
      className="browser-card w-full max-w-[520px] overflow-hidden rounded-2xl border border-line bg-bg-3 shadow-card transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] [transform-style:preserve-3d] [transform:rotate(0.6deg)] max-[900px]:[transform:none]"
      style={{ willChange: "transform" }}
    >
      {/* Browser chrome */}
      <div className="browser-bar flex items-center gap-2 border-b border-line bg-bg-2 px-4 py-3 max-[520px]:px-3.5 max-[520px]:py-2.5 [transform:translateZ(20px)] max-[900px]:[transform:none]">
        <div className="flex flex-shrink-0 gap-1.5">
          <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center font-mono text-[12px] text-ink-2 max-[520px]:text-[11px]">
          {FIXTURE.url.split("/").slice(0, 1).join("/")}
          <span className="text-ink">/{FIXTURE.url.split("/").slice(1).join("/")}</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Body */}
      <div className="card-body px-7 pb-6 pt-[22px] max-[520px]:px-5 max-[520px]:pb-[22px] max-[520px]:pt-5 [transform:translateZ(10px)] max-[900px]:[transform:none]">
        <div className="mb-3.5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2 before:h-[7px] before:w-[7px] before:rounded-full before:bg-coral before:shadow-[0_0_8px_var(--coral)] before:content-['']">
          Live example
        </div>
        <div className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
          {FIXTURE.bizName}
        </div>
        <div className="mb-[18px] text-[13px] text-ink-2">
          {FIXTURE.category} · {FIXTURE.location}
        </div>
        <div className="-mx-7 mb-[18px] h-px bg-line max-[520px]:-mx-5 max-[520px]:mb-4" />

        {/* Score */}
        <div className="score-block mb-5 text-center [transform:translateZ(30px)] max-[900px]:[transform:none]">
          <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-2">
            Visibility score
          </div>
          <div
            className="inline-flex items-baseline gap-1 text-[72px] font-bold leading-none tracking-[-0.04em] text-ink max-[520px]:text-[56px]"
            aria-live="polite"
            aria-label={`Visibility score: ${FIXTURE.score} out of 100`}
          >
            <span
              className="tabular-nums"
              // tabular-nums keeps the digit width fixed during the count
              // so the /100 suffix doesn't twitch sideways.
            >
              {displayedScore}
            </span>
            <span className="font-mono text-[15px] font-medium tracking-normal text-ink-3">
              /100
            </span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-coral-deep motion-safe:animate-enter-fade motion-safe:[animation-delay:1900ms] before:h-2.5 before:w-2.5 before:rounded-full before:content-[''] before:[background:conic-gradient(var(--amber)_0%_50%,var(--line)_50%_100%)]">
            {FIXTURE.verdict}
          </div>
        </div>

        {/* Mini grid */}
        <table className="mini-grid mb-4 w-full border-collapse text-[12px] max-[520px]:text-[11px] [transform:translateZ(15px)] max-[900px]:[transform:none]">
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
                // count begins. Opacity-only so the table's translateZ(15px)
                // depth isn't disturbed.
                className="motion-safe:animate-enter-fade"
                style={{ animationDelay: `${1500 + i * 120}ms` }}
              >
                <td
                  className={`max-w-[110px] py-2 pl-[2px] pr-1 text-left font-medium text-ink ${i === FIXTURE.rows.length - 1 ? "border-b-0" : "border-b border-line"}`}
                >
                  {row.query}
                </td>
                {row.marks.map((mark, j) => (
                  <td
                    key={j}
                    className={`p-2 text-center max-[520px]:p-[7px] ${i === FIXTURE.rows.length - 1 ? "border-b-0" : "border-b border-line"}`}
                  >
                    <span className={`inline-block h-3 w-3 rounded-full ${MARK_BG[mark]}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-2 max-[520px]:text-[10px]">
            {FIXTURE.score}/100 · {FIXTURE.audited} audited
          </span>
          <a
            href="#audit-form"
            className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-coral no-underline transition-[gap] duration-150 hover:gap-2"
          >
            Try your own <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
