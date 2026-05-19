import { useEffect, useState } from "react";

interface Me {
  id: string;
  email: string;
  name?: string | null;
  tier: "free" | "premium" | "ultra";
}

const API_ORIGIN = import.meta.env.PUBLIC_API_ORIGIN ?? "http://localhost:4000";

export default function Header() {
  const [me, setMe] = useState<Me | null>(null);
  const [providers, setProviders] = useState<{ google: boolean; linkedin: boolean }>({
    google: false,
    linkedin: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch(`${API_ORIGIN}/auth/me`, { credentials: "include" })
        .then((r) => r.json())
        .then((d: { user: Me | null }) => d.user)
        .catch(() => null),
      fetch(`${API_ORIGIN}/auth/providers`)
        .then((r) => r.json())
        .catch(() => ({ google: false, linkedin: false })),
    ]).then(([user, p]) => {
      setMe(user ?? null);
      setProviders(p as { google: boolean; linkedin: boolean });
      setLoaded(true);
    });
  }, []);

  async function logout() {
    await fetch(`${API_ORIGIN}/auth/logout`, { method: "POST", credentials: "include" });
    setMe(null);
    window.location.href = "/";
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <a href="/" className="font-bold text-slate-900 text-lg">
          Geo<span className="text-brand-600">Tracker</span>
        </a>
        <nav className="flex items-center gap-3 text-sm">
          {!loaded ? null : me ? (
            <>
              <a href="/dashboard" className="text-slate-700 hover:text-brand-600">Dashboard</a>
              <span className="text-slate-500 hidden sm:inline">{me.email}</span>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {providers.google ? (
                <a
                  href={`${API_ORIGIN}/auth/google`}
                  className="rounded-lg bg-slate-900 text-white px-3 py-1.5 font-medium hover:bg-slate-800"
                >
                  Sign in with Google
                </a>
              ) : null}
              {providers.linkedin ? (
                <a
                  href={`${API_ORIGIN}/auth/linkedin`}
                  className="rounded-lg bg-[#0a66c2] text-white px-3 py-1.5 font-medium hover:bg-[#084c93]"
                >
                  Sign in with LinkedIn
                </a>
              ) : null}
              {!providers.google && !providers.linkedin ? (
                <span className="text-xs text-slate-400">Sign-in not configured</span>
              ) : null}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
