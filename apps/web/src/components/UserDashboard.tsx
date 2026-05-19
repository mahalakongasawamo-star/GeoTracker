import { useEffect, useState } from "react";

interface MeUser {
  id: string;
  email: string;
  name?: string | null;
  tier: "free" | "premium" | "ultra";
}

interface AuditRow {
  id: string;
  status: string;
  score: number;
  startedAt: string;
  completedAt: string | null;
  domain: string;
  name: string | null;
  industrySlug: string | null;
}

interface PulseSub {
  id: string;
  nextRunAt: string;
  lastAuditId: string | null;
  domain: string;
  name: string | null;
}

const API_ORIGIN = import.meta.env.PUBLIC_API_ORIGIN ?? "http://localhost:4000";

function bandColor(score: number): string {
  if (score >= 75) return "text-score-green";
  if (score >= 40) return "text-score-yellow";
  return "text-score-red";
}

export default function UserDashboard() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [subs, setSubs] = useState<PulseSub[]>([]);
  const [pulseOptIn, setPulseOptIn] = useState(true);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const meRes = await fetch(`${API_ORIGIN}/auth/me`, { credentials: "include" }).then((r) => r.json());
    if (!meRes.user) {
      setLoaded(true);
      return;
    }
    setMe(meRes.user);
    const [auditRes, subRes] = await Promise.all([
      fetch(`${API_ORIGIN}/me/audits`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API_ORIGIN}/me/pulse/subscriptions`, { credentials: "include" }).then((r) => r.json()),
    ]);
    setAudits(auditRes.audits ?? []);
    setSubs(subRes.subscriptions ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function togglePulse(next: boolean) {
    setPulseOptIn(next);
    await fetch(`${API_ORIGIN}/me/pulse`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ optIn: next }),
    });
  }

  async function subscribeAudit(auditId: string) {
    await fetch(`${API_ORIGIN}/me/pulse/subscriptions`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditId }),
    });
    void refresh();
  }

  if (!loaded) return <p className="text-slate-500">Loading…</p>;
  if (!me) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Sign in to see your dashboard</h2>
        <p className="mt-2 text-slate-600 text-sm">
          You can run anonymous audits without an account. Sign in to track audits
          over time and receive monthly Pulse Reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your dashboard</h1>
          <p className="text-slate-600 text-sm">{me.email} · {me.tier} tier</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={pulseOptIn}
            onChange={(e) => togglePulse(e.target.checked)}
          />
          Monthly Pulse Report email
        </label>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Past audits</h2>
        {audits.length === 0 ? (
          <p className="mt-3 text-slate-500 text-sm">No audits yet. Run one from the home page.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Business</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Industry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Score</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Run</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">
                      <a href={`/audit/${a.id}`} className="font-medium hover:underline">
                        {a.name ?? a.domain}
                      </a>
                      <div className="text-xs text-slate-500">{a.domain}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.industrySlug ?? "—"}</td>
                    <td className={`px-4 py-3 font-bold ${bandColor(a.score)}`}>{a.score}</td>
                    <td className="px-4 py-3 text-slate-600">{a.status}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(a.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => subscribeAudit(a.id)}
                        className="text-brand-600 hover:underline text-sm"
                      >
                        Subscribe to Pulse
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Pulse subscriptions</h2>
        {subs.length === 0 ? (
          <p className="mt-3 text-slate-500 text-sm">
            Subscribe to a business above to get monthly visibility re-checks by email.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {subs.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <div className="font-medium text-slate-800">{s.name ?? s.domain}</div>
                  <div className="text-xs text-slate-500">Next run: {new Date(s.nextRunAt).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
