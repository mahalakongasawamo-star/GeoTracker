import { useEffect, useState } from "react";
import { LLM_DISPLAY, LLM_PROVIDERS, type AuditDetail, type LlmProvider, type ProgressEvent } from "@geotracker/shared";
import { getAudit, streamAudit } from "../lib/api";
import { track } from "../lib/analytics";
import ScoreGauge from "./ScoreGauge";
import LLMGrid from "./LLMGrid";
import BlindSpots from "./BlindSpots";
import VendorMatrix from "./VendorMatrix";
import SolutionPitch from "./SolutionPitch";

interface Props {
  auditId: string;
}

type LlmStatus = "pending" | "running" | "done";

const EDUCATIONAL_TIPS = [
  "AI engines are replacing the classic blue-link search experience.",
  "Being mentioned is only half the battle — being bookable is the win.",
  "ChatGPT, Perplexity, and Gemini are now used for local recommendations.",
  "AI answers change daily. Most businesses have no idea where they stand.",
];

export default function AuditRunner({ auditId }: Props) {
  const [ratio, setRatio] = useState(0);
  const [statuses, setStatuses] = useState<Record<LlmProvider, LlmStatus>>(() => {
    return LLM_PROVIDERS.reduce(
      (acc, p) => ({ ...acc, [p]: "pending" as LlmStatus }),
      {} as Record<LlmProvider, LlmStatus>,
    );
  });
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const cycle = setInterval(() => setTipIdx((i) => (i + 1) % EDUCATIONAL_TIPS.length), 3500);
    return () => clearInterval(cycle);
  }, []);

  useEffect(() => {
    let finalized = false;

    const close = streamAudit(auditId, (e: ProgressEvent) => {
      setRatio(e.completedRatio);
      if (e.llm) {
        setStatuses((s) => ({
          ...s,
          [e.llm!]: e.completedRatio >= 1 ? "done" : "running",
        }));
      }
      if (e.type === "complete" && !finalized) {
        finalized = true;
        void getAudit(auditId).then((d) => {
          setDetail(d);
          track("audit_completed", { auditId, score: d.score, status: d.status });
          setStatuses(
            LLM_PROVIDERS.reduce(
              (acc, p) => ({ ...acc, [p]: "done" as LlmStatus }),
              {} as Record<LlmProvider, LlmStatus>,
            ),
          );
        });
      }
    });

    // Fallback polling in case SSE never delivers (proxy edge case).
    const poll = setInterval(async () => {
      const d = await getAudit(auditId).catch(() => null);
      if (!d) return;
      if (d.status === "complete" || d.status === "partial") {
        if (!finalized) {
          finalized = true;
          setDetail(d);
          clearInterval(poll);
        }
      }
    }, 2000);

    return () => {
      close();
      clearInterval(poll);
    };
  }, [auditId]);

  if (detail && (detail.status === "complete" || detail.status === "partial")) {
    return (
      <div className="space-y-12">
        <header className="text-center">
          <p className="text-brand-600 text-sm font-semibold uppercase tracking-wide">
            Audit complete
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900">
            {detail.business.name ?? detail.business.domain}
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            {detail.business.domain}
            {detail.business.industrySlug ? ` · ${detail.business.industrySlug}` : ""}
          </p>
        </header>

        <section className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
          <ScoreGauge score={detail.score} />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Per-prompt × LLM coverage</h2>
            <p className="mt-1 text-slate-600 text-sm">
              Aggregated across {detail.catchmentCities.length} cities in your catchment area.
            </p>
            <div className="mt-4">
              <LLMGrid rows={detail.rows} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">AI Blind Spots</h2>
          <p className="mt-1 text-slate-600 text-sm">What's costing you AI-driven leads right now.</p>
          <div className="mt-4">
            <BlindSpots rows={detail.rows} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Who can fix this?</h2>
          <p className="mt-1 text-slate-600 text-sm">DIY tools vs. a full-service AI-optimized agency.</p>
          <div className="mt-4">
            <VendorMatrix />
          </div>
        </section>

        <SolutionPitch />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-16">
      <h1 className="text-3xl font-bold text-center text-slate-900">
        Asking 5 AI engines about your business…
      </h1>
      <p className="mt-3 text-center text-slate-600">{EDUCATIONAL_TIPS[tipIdx]}</p>

      <div className="mt-10 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-brand-600 transition-all duration-300"
          style={{ width: `${Math.round(ratio * 100)}%` }}
          aria-label={`Audit progress: ${Math.round(ratio * 100)}%`}
        />
      </div>

      <ul className="mt-8 space-y-3">
        {LLM_PROVIDERS.map((p) => {
          const s = statuses[p];
          const dot =
            s === "done"
              ? "bg-green-500"
              : s === "running"
                ? "bg-brand-500 animate-pulse"
                : "bg-slate-300";
          const label = s === "done" ? "Done" : s === "running" ? "Asking…" : "Pending";
          return (
            <li
              key={p}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                <span className="font-medium text-slate-800">{LLM_DISPLAY[p]}</span>
              </div>
              <span className="text-sm text-slate-500">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
