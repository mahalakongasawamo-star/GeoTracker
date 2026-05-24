import { LLM_DISPLAY, LLM_PROVIDERS, type AuditResultRow, type LlmProvider } from "@geotracker/shared";

interface Props {
  rows: AuditResultRow[];
}

// A provider is in "sample data" mode if every one of its rows in the
// current audit was served by the mock fallback (real adapter on, no
// API key for this provider).
function providersServingSampleData(rows: AuditResultRow[]): Set<LlmProvider> {
  const out = new Set<LlmProvider>();
  for (const p of LLM_PROVIDERS) {
    const providerRows = rows.filter((r) => r.llm === p);
    if (providerRows.length === 0) continue;
    if (providerRows.every((r) => r.source === "mock_fallback")) out.add(p);
  }
  return out;
}

const BAND_GLYPH: Record<string, { glyph: string; bg: string; title: string }> = {
  green: { glyph: "✓", bg: "bg-green-100 text-green-700", title: "Top-3 with contact info" },
  yellow: { glyph: "!", bg: "bg-yellow-100 text-yellow-700", title: "Mentioned but not actionable" },
  red: { glyph: "✕", bg: "bg-red-100 text-red-700", title: "Not mentioned" },
  unavailable: { glyph: "—", bg: "bg-slate-100 text-slate-500", title: "API unavailable" },
};

export default function LLMGrid({ rows }: Props) {
  // Aggregate to one cell per (prompt × LLM): worst band wins so the user
  // sees the weakest signal first.
  const prompts = Array.from(new Set(rows.map((r) => r.promptText)));
  const order: Record<string, number> = { green: 3, yellow: 2, red: 1, unavailable: 0 };
  const sampleProviders = providersServingSampleData(rows);
  function worstBand(prompt: string, llm: string): string {
    const cells = rows.filter((r) => r.promptText === prompt && r.llm === llm);
    if (cells.length === 0) return "unavailable";
    // Pick the worst band across the cells (lowest order). Seed with the
    // first cell's band so a single "green" cell stays green.
    return cells.reduce<string>(
      (acc, c) => (order[c.scoreBand]! < order[acc]! ? c.scoreBand : acc),
      cells[0]!.scoreBand,
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-slate-700 w-[44%]">Prompt</th>
            {LLM_PROVIDERS.map((p) => (
              <th key={p} className="px-3 py-3 text-center font-semibold text-slate-700">
                <div>{LLM_DISPLAY[p]}</div>
                {sampleProviders.has(p) && (
                  <div
                    className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                    title="No API key configured for this provider — cells use deterministic sample data."
                  >
                    Sample data
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prompts.map((prompt) => (
            <tr key={prompt} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-700">{prompt}</td>
              {LLM_PROVIDERS.map((p) => {
                const band = worstBand(prompt, p);
                const v = BAND_GLYPH[band]!;
                return (
                  <td key={p} className="px-3 py-3 text-center">
                    <span
                      title={v.title}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold ${v.bg}`}
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
