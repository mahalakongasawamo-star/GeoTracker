import type { AuditResultRow } from "@geotracker/shared";

interface Props {
  rows: AuditResultRow[];
}

interface Insight {
  title: string;
  body: string;
  severity: "red" | "yellow";
}

function buildInsights(rows: AuditResultRow[]): Insight[] {
  const insights: Insight[] = [];
  const total = rows.length || 1;
  const reds = rows.filter((r) => r.scoreBand === "red").length;
  const yellows = rows.filter((r) => r.scoreBand === "yellow").length;
  const noContact = rows.filter((r) => r.mentioned && !r.hasContactInfo).length;
  const caveats = rows.filter((r) => r.caveatFlag).length;

  if (reds / total > 0.4) {
    insights.push({
      title: "AI engines don't know you exist",
      body:
        "More than 40% of buying-intent queries returned recommendations without your business in the answer at all. This is the biggest revenue leak in the AI era.",
      severity: "red",
    });
  }

  if (noContact > 0) {
    insights.push({
      title: "On the radar, but not actionable",
      body:
        "You're mentioned but the AI isn't surfacing a phone, website, or booking path. In the AI era, being mentioned is only half the battle — being bookable is where the win is.",
      severity: "yellow",
    });
  }

  if (caveats > 0) {
    insights.push({
      title: "Reputation caveats are leaking into answers",
      body:
        "Some answers reference you with hedges or warnings (mixed reviews, limited info). AI engines amplify whatever they find — content gaps and unmanaged review signals show up here.",
      severity: "yellow",
    });
  }

  if (yellows / total > 0.3 && reds / total <= 0.4) {
    insights.push({
      title: "Ranked, but not in the top-3",
      body:
        "You appear in answers but past the top-3 — where >80% of clicks and bookings concentrate in AI recommendation flows.",
      severity: "yellow",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Solid coverage — keep monitoring",
      body:
        "Your business shows up consistently in AI answers. Subscribe to a monthly Pulse Report to catch regressions before competitors close the gap.",
      severity: "yellow",
    });
  }

  return insights;
}

export default function BlindSpots({ rows }: Props) {
  const insights = buildInsights(rows);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {insights.map((i) => (
        <div
          key={i.title}
          className={`rounded-2xl border p-5 bg-white ${
            i.severity === "red" ? "border-red-200" : "border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                i.severity === "red"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {i.severity === "red" ? "✕" : "!"}
            </span>
            <h3 className="font-semibold text-slate-900">{i.title}</h3>
          </div>
          <p className="mt-3 text-slate-600 text-sm">{i.body}</p>
        </div>
      ))}
    </div>
  );
}
