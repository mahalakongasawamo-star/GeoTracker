import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LLM_DISPLAY, LLM_PROVIDERS, type LlmProvider } from "@geotracker/shared";
import { PROVIDER_MARKS } from "./logos/ProviderLogos";

// Pure decoration. Loops a fake audit run on an 8s cycle so the landing
// feels "alive" without hitting the real API. Pauses via
// IntersectionObserver when off-screen to spare CPU on long pages, and
// degrades to a static end-state under prefers-reduced-motion.

interface Row {
  provider: LlmProvider;
  rank: 1 | 2 | 3 | null;
  band: "green" | "yellow" | "red";
}

const FINAL_ROWS: Row[] = [
  { provider: "chatgpt", rank: 2, band: "green" },
  { provider: "claude", rank: 1, band: "green" },
  { provider: "gemini", rank: null, band: "red" },
  { provider: "perplexity", rank: 3, band: "yellow" },
  { provider: "grok", rank: null, band: "red" },
];

const BAND_COLOR: Record<Row["band"], string> = {
  green: "from-emerald-400 to-emerald-600",
  yellow: "from-amber-400 to-amber-500",
  red: "from-rose-400 to-rose-500",
};

const BAND_LABEL: Record<Row["band"], string> = {
  green: "Mentioned",
  yellow: "Mentioned, no link",
  red: "Not mentioned",
};

const FINAL_SCORE = 62;
const CYCLE_MS = 8000;

export default function LiveAuditDemo() {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !active) return;
    const id = setInterval(() => setTick((t) => t + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, [active, prefersReducedMotion]);

  // tick changes the keys on motion elements so framer-motion replays
  // the entrance + score sweep at the start of each cycle.
  const cycleKey = prefersReducedMotion ? "static" : `cycle-${tick}`;

  return (
    <section className="px-6 py-20" ref={containerRef}>
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Here's what an audit looks like
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            A live read across every major AI engine
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/60 bg-white/55 p-6 shadow-glass-lg backdrop-blur-2xl">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">brightsmiles-dental.com</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-500" />
                Running
              </span>
            </div>
            <ul className="mt-5 space-y-3">
              {LLM_PROVIDERS.map((p, idx) => {
                const row = FINAL_ROWS.find((r) => r.provider === p)!;
                const Mark = PROVIDER_MARKS[p];
                return (
                  <li key={p} className="flex items-center gap-3 rounded-xl bg-white/40 px-3 py-2.5 ring-1 ring-white/40">
                    <Mark className="h-5 w-5 text-slate-700" />
                    <span className="w-24 text-sm font-medium text-slate-800">
                      {LLM_DISPLAY[p]}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                      <motion.div
                        key={`${cycleKey}-${p}`}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{
                          duration: prefersReducedMotion ? 0 : 2.6,
                          delay: prefersReducedMotion ? 0 : idx * 0.45,
                          ease: "easeInOut",
                        }}
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${BAND_COLOR[row.band]}`}
                      />
                    </div>
                    <motion.span
                      key={`${cycleKey}-${p}-label`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: prefersReducedMotion ? 0 : idx * 0.45 + 2.6,
                        duration: 0.35,
                      }}
                      className={`w-32 shrink-0 text-right text-xs font-medium ${
                        row.band === "green"
                          ? "text-emerald-700"
                          : row.band === "yellow"
                            ? "text-amber-700"
                            : "text-rose-700"
                      }`}
                    >
                      {row.rank ? `#${row.rank} · ` : ""}
                      {BAND_LABEL[row.band]}
                    </motion.span>
                  </li>
                );
              })}
            </ul>
          </div>

          <ScoreCard cycleKey={cycleKey} prefersReducedMotion={!!prefersReducedMotion} />
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ cycleKey, prefersReducedMotion }: { cycleKey: string; prefersReducedMotion: boolean }) {
  const [shown, setShown] = useState(prefersReducedMotion ? FINAL_SCORE : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setShown(FINAL_SCORE);
      return;
    }
    setShown(0);
    let raf = 0;
    const start = performance.now();
    const duration = 2200;
    const delay = 800;
    const tickFn = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start - delay) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * FINAL_SCORE));
      if (t < 1) raf = requestAnimationFrame(tickFn);
    };
    raf = requestAnimationFrame(tickFn);
    return () => cancelAnimationFrame(raf);
  }, [cycleKey, prefersReducedMotion]);

  // arc settings
  const r = 64;
  const c = 2 * Math.PI * r;
  const progress = shown / 100;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/60 bg-white/55 p-6 shadow-glass-lg backdrop-blur-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        AI Visibility Score
      </p>
      <div className="relative mt-2 h-44 w-44">
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="12" />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="url(#scoreGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            style={{ transition: prefersReducedMotion ? "none" : "stroke-dashoffset 80ms linear" }}
          />
          <defs>
            <linearGradient id="scoreGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#0b8de8" />
              <stop offset="100%" stopColor="#0a548f" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums text-slate-900">{shown}</span>
          <span className="text-xs text-slate-500">out of 100</span>
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-slate-600">
        2 of 5 engines recommend you.
        <br />
        <span className="text-rose-600">3 don't see you yet.</span>
      </p>
    </div>
  );
}
