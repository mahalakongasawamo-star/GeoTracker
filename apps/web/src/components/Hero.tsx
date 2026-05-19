import { useState } from "react";
import { INDUSTRIES } from "@geotracker/shared";
import { startAudit } from "../lib/api";

export default function Hero() {
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [industrySlug, setIndustrySlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!domain.trim()) {
      setError("Enter a domain to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await startAudit({
        domain: domain.trim(),
        businessName: name.trim() || undefined,
        city: city.trim() || undefined,
        industrySlug: industrySlug || undefined,
      });
      window.location.href = `/audit/${id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
      <p className="text-brand-600 font-semibold tracking-wide uppercase text-sm mb-4">
        AI Visibility Audit
      </p>
      <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
        Do AI engines actually recommend your business?
      </h1>
      <p className="mt-5 text-lg text-slate-600">
        We ask ChatGPT, Perplexity, Claude, Gemini, and Grok the questions your
        customers are asking — and show you the gap between you and your
        competitors.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3 text-left"
      >
        <input
          aria-label="Business domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourbusiness.com"
          className="md:col-span-2 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          aria-label="Business name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Business name (optional)"
          className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          aria-label="City (optional)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City (optional, defaults to Austin)"
          className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          aria-label="Industry"
          value={industrySlug}
          onChange={(e) => setIndustrySlug(e.target.value)}
          className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Industry — auto-detect</option>
          {INDUSTRIES.map((i) => (
            <option key={i.slug} value={i.slug}>{i.displayName}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-5 py-3 transition"
        >
          {submitting ? "Starting…" : "Check My Visibility Score"}
        </button>
      </form>
      {error ? (
        <p className="mt-4 text-red-600 text-sm" role="alert">{error}</p>
      ) : null}

      <p className="mt-6 text-xs text-slate-500">
        Free audit. Results in under 15 seconds.
      </p>
    </section>
  );
}
