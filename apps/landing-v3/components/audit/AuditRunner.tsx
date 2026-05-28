"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LLM_DISPLAY,
  LLM_PROVIDERS,
  type AuditDetail,
  type AuditResultRow,
  type LlmProvider,
  type ProgressEvent,
} from "@geotracker/shared";
import { getAudit, streamAudit } from "@/lib/api";

// M4 port of apps/web's AuditRunner into the Aurum-brand tear-sheet
// language. Two states share this file:
//   - running: live progress, per-engine status, cycling tip
//   - complete (or partial): tear-sheet result with score deck + grid +
//     two banners (sample-data, partial-coverage)
//
// Out of scope this pass (lived in apps/web but not ported yet):
// BlindSpots, CompetitorMentions, VendorMatrix, SolutionPitch. They can
// come back as separate brand-aware components.

interface Props {
  auditId: string;
}

type LlmStatus = "pending" | "running" | "done";

const EDUCATIONAL_TIPS = [
  "AI engines are replacing the classic blue-link search experience.",
  "Being mentioned is only half the battle. Being bookable is the win.",
  "ChatGPT, Perplexity, and Gemini are now used for local recommendations.",
  "AI answers change daily. Most businesses have no idea where they stand.",
];

// Verdict bands lifted from the LiveExampleCard's editorial voice. The
// scoring service returns 0..100; we name what that means so the deck
// reads as one editorial line, not a raw number.
function verdictFor(score: number): string {
  if (score >= 80) return "Highly visible to AI.";
  if (score >= 60) return "Visible to AI.";
  if (score >= 40) return "Partially visible to AI.";
  if (score >= 20) return "Barely visible to AI.";
  return "Invisible to AI.";
}

export default function AuditRunner({ auditId }: Props) {
  const [ratio, setRatio] = useState(0);
  const [statuses, setStatuses] = useState<Record<LlmProvider, LlmStatus>>(() =>
    LLM_PROVIDERS.reduce(
      (acc, p) => ({ ...acc, [p]: "pending" as LlmStatus }),
      {} as Record<LlmProvider, LlmStatus>,
    ),
  );
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [tipIdx, setTipIdx] = useState(0);
  const finalizedRef = useRef(false);

  // Cycle the educational tip every 3.5s while running.
  useEffect(() => {
    if (detail) return;
    const cycle = setInterval(
      () => setTipIdx((i) => (i + 1) % EDUCATIONAL_TIPS.length),
      3500,
    );
    return () => clearInterval(cycle);
  }, [detail]);

  // SSE for progress, with a 2s polling fallback in case the stream is
  // blocked by a proxy or never delivers the "complete" event.
  useEffect(() => {
    const close = streamAudit(auditId, (e: ProgressEvent) => {
      setRatio(e.completedRatio);
      if (e.llm) {
        setStatuses((s) => ({
          ...s,
          [e.llm!]: e.completedRatio >= 1 ? "done" : "running",
        }));
      }
      if (e.type === "complete" && !finalizedRef.current) {
        finalizedRef.current = true;
        void getAudit(auditId).then((d) => {
          setDetail(d);
          setStatuses(
            LLM_PROVIDERS.reduce(
              (acc, p) => ({ ...acc, [p]: "done" as LlmStatus }),
              {} as Record<LlmProvider, LlmStatus>,
            ),
          );
        });
      }
    });

    const poll = setInterval(async () => {
      const d = await getAudit(auditId).catch(() => null);
      if (!d) return;
      if ((d.status === "complete" || d.status === "partial") && !finalizedRef.current) {
        finalizedRef.current = true;
        setDetail(d);
        clearInterval(poll);
      }
    }, 2000);

    return () => {
      close();
      clearInterval(poll);
    };
  }, [auditId]);

  if (detail && (detail.status === "complete" || detail.status === "partial")) {
    return <AuditResult detail={detail} />;
  }

  return <AuditRunning ratio={ratio} statuses={statuses} tip={EDUCATIONAL_TIPS[tipIdx]!} />;
}

// --- Running state -----------------------------------------------------

function AuditRunning({
  ratio,
  statuses,
  tip,
}: {
  ratio: number;
  statuses: Record<LlmProvider, LlmStatus>;
  tip: string;
}) {
  const pct = Math.round(ratio * 100);

  return (
    <section className="mx-auto max-w-[640px] pt-6">
      <div className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-eyebrow-pulse rounded-full bg-coral" />
        Auditing now
      </div>

      <h1 className="mb-3 text-[clamp(28px,4vw,44px)] font-bold leading-[1.05] tracking-[-0.025em] text-ink">
        We’re asking five engines what they{" "}
        <span className="font-serif font-normal italic text-coral">know</span> about your business.
      </h1>

      <p className="mb-9 max-w-[520px] text-[15px] leading-[1.55] text-ink-2">
        About twelve seconds. You’ll see each engine report in below as it
        answers. Tip: <span className="italic">{tip}</span>
      </p>

      <div
        className="relative mb-1 h-px w-full bg-line"
        role="progressbar"
        aria-label={`Audit progress: ${pct}%`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="absolute inset-y-0 left-0 bg-coral transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mb-9 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        <span>{pct}% complete</span>
        <span>5 engines · 8 prompts × 6 cities</span>
      </div>

      <ul className="space-y-2">
        {LLM_PROVIDERS.map((p) => {
          const s = statuses[p];
          const dotClass =
            s === "done"
              ? "bg-green"
              : s === "running"
                ? "bg-coral animate-eyebrow-pulse"
                : "bg-line-strong";
          const label = s === "done" ? "Done" : s === "running" ? "Asking…" : "Pending";
          return (
            <li
              key={p}
              className="flex items-center justify-between border-b border-line py-3 last:border-b-0"
            >
              <span className="inline-flex items-center gap-3">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dotClass}`} />
                <span className="text-[15px] font-medium text-ink">{LLM_DISPLAY[p]}</span>
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2">
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// --- Complete / partial state -----------------------------------------

function AuditResult({ detail }: { detail: AuditDetail }) {
  const startedDate = useMemo(() => {
    try {
      const d = new Date(detail.startedAt);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return "";
    }
  }, [detail.startedAt]);

  const folio = useMemo(() => detail.id.slice(0, 4).toUpperCase(), [detail.id]);
  const verdict = verdictFor(detail.score);
  const businessLabel = detail.business.name ?? detail.business.domain;

  return (
    <article
      aria-label={`Audit tear-sheet for ${businessLabel}: score ${detail.score} out of 100. ${verdict}`}
      className="relative w-full border-y border-ink bg-bg-paper px-11 pb-10 pt-9 max-[520px]:px-6 max-[520px]:pb-8 max-[520px]:pt-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-7 top-4 select-none font-serif text-[56px] italic leading-[0.9] text-line-strong max-[520px]:right-4 max-[520px]:top-3 max-[520px]:text-[36px]"
      >
        {folio}
      </div>

      <div className="mb-[26px] flex items-baseline justify-between gap-4 border-b border-line-strong pb-[18px] font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
        <span className="inline-flex items-center gap-2.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-coral" />
          GeoTracker · Audit · {startedDate}
        </span>
        <span className="text-ink-3">
          No. {folio}
          {detail.status === "partial" && <span className="ml-2 text-amber">· Partial</span>}
        </span>
      </div>

      <h1 className="mb-1.5 text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-ink max-[520px]:text-[24px]">
        {businessLabel}
      </h1>
      <div className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">
        {detail.business.domain}
        {detail.business.industrySlug ? ` · ${detail.business.industrySlug}` : ""}
        {detail.catchmentCities.length > 0
          ? ` · ${detail.catchmentCities.length} ${detail.catchmentCities.length === 1 ? "city" : "cities"}`
          : ""}
      </div>

      <p className="mb-[22px] max-w-[560px] font-serif text-[26px] italic leading-[1.18] tracking-[-0.005em] text-ink max-[520px]:text-[22px]">
        Scored <span className="text-coral-deep">{detail.score} out of 100.</span>{" "}
        {verdict}
      </p>

      <div className="mb-[26px] flex items-baseline gap-[18px] border-y border-line-strong py-5">
        <span className="text-[72px] font-bold leading-[0.9] tracking-[-0.04em] text-ink tabular-nums max-[520px]:text-[56px]">
          {detail.score}
        </span>
        <span className="font-mono text-[14px] tracking-[0.04em] text-ink-3">/ 100</span>
        <span className="ml-auto text-right font-mono text-[10px] uppercase leading-[1.5] tracking-[0.16em] text-ink-2">
          Visibility score
          <br />
          {detail.rows.length} cells measured
        </span>
      </div>

      <SampleDataBanner rows={detail.rows} />
      <PartialCoverageBanner rows={detail.rows} />

      <LLMCoverageGrid rows={detail.rows} />

      <div className="mt-[26px] flex flex-wrap items-baseline justify-between gap-3 border-t border-line-strong pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
          Audit {detail.id.slice(0, 8)} · {detail.rows.length} cells
        </span>
        <Link
          href="/"
          className="inline-flex items-baseline gap-1.5 font-serif text-[18px] italic text-coral no-underline transition-[gap] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:gap-2.5"
        >
          Run another audit <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

// --- Helpers (banners + grid) ------------------------------------------

function providersServingSampleData(rows: AuditResultRow[]): LlmProvider[] {
  const out: LlmProvider[] = [];
  for (const p of LLM_PROVIDERS) {
    const providerRows = rows.filter((r) => r.llm === p);
    if (providerRows.length === 0) continue;
    if (providerRows.every((r) => r.source === "mock_fallback")) out.push(p);
  }
  return out;
}

interface ProviderAvailability {
  available: number;
  total: number;
}

function providersWithPartialAvailability(
  rows: AuditResultRow[],
): Map<LlmProvider, ProviderAvailability> {
  const out = new Map<LlmProvider, ProviderAvailability>();
  for (const p of LLM_PROVIDERS) {
    const providerRows = rows.filter((r) => r.llm === p);
    if (providerRows.length === 0) continue;
    if (providerRows.every((r) => r.source === "mock_fallback")) continue;
    const total = providerRows.length;
    const available = providerRows.filter((r) => r.scoreBand !== "unavailable").length;
    if (available < total) out.set(p, { available, total });
  }
  return out;
}

function SampleDataBanner({ rows }: { rows: AuditResultRow[] }) {
  const sample = useMemo(() => providersServingSampleData(rows), [rows]);
  if (sample.length === 0) return null;
  const names = sample.map((p) => LLM_DISPLAY[p]).join(", ");
  return (
    <div className="mb-4 rounded-[3px] border-l-0 border-y border-amber/40 bg-amber/10 px-4 py-3 text-[13px] leading-[1.5] text-ink">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">
        Sample data
      </span>{" "}
      <span className="font-serif italic text-coral-deep">{names}</span> {sample.length === 1 ? "is" : "are"}{" "}
      not yet connected to a live API. Those cells use deterministic sample
      responses so the audit can still complete; treat them as illustrative.
    </div>
  );
}

function PartialCoverageBanner({ rows }: { rows: AuditResultRow[] }) {
  const partial = useMemo(() => providersWithPartialAvailability(rows), [rows]);
  if (partial.size === 0) return null;
  const parts = [...partial.entries()]
    .map(([p, a]) => `${LLM_DISPLAY[p]} (${a.available}/${a.total})`)
    .join(", ");
  return (
    <div className="mb-4 rounded-[3px] border-y border-coral/40 bg-coral-soft/40 px-4 py-3 text-[13px] leading-[1.5] text-ink">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">
        Partial coverage
      </span>{" "}
      <span className="font-serif italic text-coral-deep">{parts}</span> returned fewer
      cells than expected, most often because the provider’s free tier rate-limited
      the audit. Missing cells appear as “—” and are excluded from the score.
    </div>
  );
}

const BAND_GLYPH: Record<
  string,
  { glyph: string; cell: string; title: string }
> = {
  green: { glyph: "✓", cell: "bg-green/15 text-green", title: "Top-3 with contact info" },
  yellow: { glyph: "!", cell: "bg-amber/20 text-amber", title: "Mentioned but not actionable" },
  red: { glyph: "✕", cell: "bg-red/15 text-red", title: "Not mentioned" },
  unavailable: { glyph: "—", cell: "bg-bg text-ink-3", title: "API unavailable" },
};

function LLMCoverageGrid({ rows }: { rows: AuditResultRow[] }) {
  const prompts = useMemo(() => Array.from(new Set(rows.map((r) => r.promptText))), [rows]);
  const sampleSet = useMemo(() => new Set(providersServingSampleData(rows)), [rows]);
  const partialMap = useMemo(() => providersWithPartialAvailability(rows), [rows]);

  // Worst-band wins per (prompt × LLM) so the user sees the weakest signal.
  const order: Record<string, number> = { green: 3, yellow: 2, red: 1, unavailable: 0 };
  function worstBand(prompt: string, llm: LlmProvider): string {
    const cells = rows.filter((r) => r.promptText === prompt && r.llm === llm);
    if (cells.length === 0) return "unavailable";
    return cells.reduce<string>(
      (acc, c) => (order[c.scoreBand]! < order[acc]! ? c.scoreBand : acc),
      cells[0]!.scoreBand,
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] max-[520px]:text-[12px]">
        <thead>
          <tr>
            <th className="border-b border-line py-2.5 pl-1 pr-2 text-left font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-ink-3">
              Prompt
            </th>
            {LLM_PROVIDERS.map((p) => (
              <th
                key={p}
                className="border-b border-line p-2.5 text-center font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-ink-3"
              >
                <div className="text-ink">{LLM_DISPLAY[p]}</div>
                {sampleSet.has(p) && (
                  <div
                    className="mt-1 inline-block rounded-sm bg-amber/20 px-1.5 py-0.5 text-[9px] tracking-[0.08em] text-ink"
                    title="No API key configured — sample data."
                  >
                    Sample
                  </div>
                )}
                {partialMap.has(p) && (
                  <div
                    className="mt-1 inline-block rounded-sm bg-coral-soft px-1.5 py-0.5 text-[9px] tracking-[0.08em] text-coral-deep"
                    title="Some cells rate-limited."
                  >
                    {partialMap.get(p)!.available}/{partialMap.get(p)!.total}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prompts.map((prompt, i) => (
            <tr key={prompt}>
              <td
                className={`max-w-[280px] py-3 pl-1 pr-2 text-left text-ink ${
                  i === prompts.length - 1 ? "border-b-0" : "border-b border-line"
                }`}
              >
                {prompt}
              </td>
              {LLM_PROVIDERS.map((p) => {
                const band = worstBand(prompt, p);
                const v = BAND_GLYPH[band]!;
                return (
                  <td
                    key={p}
                    className={`p-2 text-center ${
                      i === prompts.length - 1 ? "border-b-0" : "border-b border-line"
                    }`}
                  >
                    <span
                      title={v.title}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-bold ${v.cell}`}
                    >
                      {v.glyph}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
