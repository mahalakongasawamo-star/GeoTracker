import { useState } from "react";
import { motion } from "framer-motion";
import { INDUSTRIES } from "@geotracker/shared";
import { startAudit } from "../../lib/api";
import { track } from "../../lib/analytics";

// Frosted hero panel: animated headline reveal, glass form card. Reuses the
// same startAudit + fields as Hero.tsx so submission behavior is identical
// (redirect to /audit/{id}). Source tag on the analytics event lets us
// compare conversion against the current home.

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function GlassHero() {
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
    track("audit_started", {
      source: "sample_landing",
      domain: domain.trim(),
      industrySlug: industrySlug || null,
      hasCity: Boolean(city.trim()),
    });
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
    <section className="relative mx-auto max-w-4xl px-6 pt-28 pb-16 text-center">
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.08, delayChildren: 0.05 }}
      >
        <motion.div
          variants={reveal}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-1.5 text-xs font-medium text-brand-700 shadow-glass backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/60" />
            <span className="relative h-2 w-2 rounded-full bg-brand-500" />
          </span>
          Live across 5 AI engines
        </motion.div>

        <motion.h1
          variants={reveal}
          className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-700 bg-clip-text text-4xl font-bold leading-[1.05] tracking-tight text-transparent sm:text-5xl md:text-6xl"
        >
          Do AI engines actually
          <br className="hidden sm:block" /> recommend your business?
        </motion.h1>

        <motion.p
          variants={reveal}
          className="mx-auto mt-5 max-w-2xl text-lg text-slate-700"
        >
          We ask ChatGPT, Claude, Gemini, Perplexity, and Grok the questions
          your customers are asking — and show you the gap between you and
          your competitors. <span className="font-semibold text-slate-900">Free, 15-second audit.</span>
        </motion.p>
      </motion.div>

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.6, ease: [0.21, 0.61, 0.35, 1] }}
        className="relative mx-auto mt-10 max-w-2xl rounded-3xl border border-white/60 bg-white/55 p-5 text-left shadow-glass-lg backdrop-blur-2xl"
      >
        <div className="absolute inset-x-12 -top-px h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            aria-label="Business domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourbusiness.com"
            className="col-span-1 rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:col-span-2"
          />
          <input
            aria-label="Business name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Business name (optional)"
            className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <input
            aria-label="City (optional)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (defaults to Austin)"
            className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <select
            aria-label="Industry"
            value={industrySlug}
            onChange={(e) => setIndustrySlug(e.target.value)}
            className="col-span-1 rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-slate-900 shadow-inner focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:col-span-2"
          >
            <option value="">Industry — auto-detect</option>
            {INDUSTRIES.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.displayName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="group relative mt-4 w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-5 py-3.5 font-semibold text-white shadow-[0_10px_30px_-10px_rgba(11,108,186,0.6)] transition hover:shadow-[0_18px_40px_-12px_rgba(11,108,186,0.7)] disabled:opacity-60"
        >
          <span className="relative z-10">
            {submitting ? "Starting your audit…" : "Check My AI Visibility →"}
          </span>
          <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:group-hover:animate-shimmer" />
        </button>
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mt-3 text-center text-xs text-slate-500">
          No credit card. Results in under 15 seconds.
        </p>
      </motion.form>
    </section>
  );
}
