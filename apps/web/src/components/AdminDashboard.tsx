import { useEffect, useState } from "react";

interface Lead {
  auditId: string;
  score: number;
  status: string;
  completedAt: string | null;
  domain: string;
  businessName: string | null;
  userEmail: string | null;
  industrySlug: string | null;
}

interface Health {
  id: string;
  llm: string;
  status: string;
  lastCheckAt: string;
  errorCount: number;
}

interface Funnel {
  total: number;
  completed: number;
  avgScore: number;
  lowScore: number;
  totalCells: number;
  inputTokens: number;
  outputTokens: number;
}

const API_ORIGIN = import.meta.env.PUBLIC_API_ORIGIN ?? "http://localhost:4000";

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [l, h, f] = await Promise.all([
        fetch(`${API_ORIGIN}/admin/leads`, { credentials: "include" }),
        fetch(`${API_ORIGIN}/admin/api-health`, { credentials: "include" }),
        fetch(`${API_ORIGIN}/admin/funnel`, { credentials: "include" }),
      ]);
      if (l.status === 403 || h.status === 403 || f.status === 403) {
        setError("Your account isn't on the admin allowlist.");
        return;
      }
      if (l.status === 401 || h.status === 401 || f.status === 401) {
        setError("Sign in to access the admin dashboard.");
        return;
      }
      const lj = await l.json();
      const hj = await h.json();
      const fj = await f.json();
      setLeads(lj.leads ?? []);
      setHealth(hj.health ?? []);
      setFunnel(fj as Funnel);
    })();
  }, []);

  if (error) return <p className="text-slate-600">{error}</p>;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Admin command center</h1>
        <p className="text-slate-600 text-sm">Lead routing, API health, conversion analytics.</p>
      </header>

      {funnel ? (
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Audits run" value={funnel.total} />
          <Stat label="Completed" value={funnel.completed} />
          <Stat label="Avg score" value={funnel.avgScore} />
          <Stat label="High-priority (<40)" value={funnel.lowScore} />
          <Stat label="LLM cells" value={funnel.totalCells} />
          <Stat label="Tokens in" value={funnel.inputTokens} />
          <Stat label="Tokens out" value={funnel.outputTokens} />
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-slate-900">High-priority leads</h2>
        <p className="text-slate-500 text-sm mt-1">Lowest visibility first.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Business</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Industry</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Completed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.auditId} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">
                    {l.businessName ?? l.domain}
                    <div className="text-xs text-slate-500">{l.domain}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.userEmail ?? "anonymous"}</td>
                  <td className="px-4 py-3 text-slate-600">{l.industrySlug ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{l.score}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {l.completedAt ? new Date(l.completedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a href={`/audit/${l.auditId}`} className="text-brand-600 hover:underline text-sm">
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">API health</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
          {health.length === 0 ? (
            <p className="text-slate-500 text-sm">No probes recorded yet.</p>
          ) : (
            health.map((h) => (
              <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="font-semibold text-slate-800">{h.llm}</div>
                <div className="text-sm text-slate-600">{h.status}</div>
                <div className="text-xs text-slate-500 mt-1">errors: {h.errorCount}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
