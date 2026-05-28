"use client";

import { useEffect, useRef, useState } from "react";
import { auditDetailUrl, startAudit } from "@/lib/api";

// The hero form. Visually 1:1 with the .audit-form / .form-helpers block in
// the Aurum mockup; behaviorally identical to apps/web's existing
// startAudit flow. On success cross-redirects to the Astro app's
// /audit/[id] (see lib/api.ts note about M4 owning the new /running route).
//
// Motion: a coral hairline sweep crosses the input while submitting, and
// the "Or try a sample" link types its value into the input one chunk per
// frame with a brief coral border flash on completion.

const SAMPLE_DOMAIN = "aurumspa.com";

// Map thrown API errors to copy that gives the visitor a next step. The
// brand voice is calm authority, not "ERROR: 400 BAD REQUEST". Unknown
// errors fall through to a generic friendly line.
function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/40\d/.test(msg) || /invalid|malformed/i.test(msg))
    return 'That doesn’t look like a domain. Try "yourbusiness.com" (no http://, no path).';
  if (/429/.test(msg) || /rate|cap|throttl|too many/i.test(msg))
    return "Too many audits from your network right now. Give it a minute and try again.";
  if (/network|fetch|timeout|abort/i.test(msg))
    return "Couldn’t reach the audit service. Check your connection and try again.";
  if (/5\d{2}/.test(msg))
    return "The audit service hit a snag. Give it a moment and try again.";
  return "Something went wrong. Try again in a moment.";
}

export default function AuditForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleFlash, setSampleFlash] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const domain = inputRef.current?.value.trim() ?? "";
    if (!domain) {
      setError("Enter a domain to continue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { id } = await startAudit({ domain });
      window.location.href = auditDetailUrl(id);
    } catch (err) {
      setError(friendlyError(err));
      setSubmitting(false);
    }
  }

  // Type the sample domain into the input one character per ~15ms (~180ms
  // for "aurumspa.com"). Under reduced motion, drop the value instantly.
  function fillSample() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      input.value = SAMPLE_DOMAIN;
      setSampleFlash(true);
      window.setTimeout(() => setSampleFlash(false), 240);
      return;
    }

    input.value = "";
    let i = 0;
    const interval = window.setInterval(() => {
      i += 1;
      input.value = SAMPLE_DOMAIN.slice(0, i);
      if (i >= SAMPLE_DOMAIN.length) {
        window.clearInterval(interval);
        setSampleFlash(true);
        window.setTimeout(() => setSampleFlash(false), 240);
      }
    }, 18);
  }

  // Hard cleanup if the component unmounts mid-type — interval ids live in
  // closure on each fillSample call, so we don't track them here.
  useEffect(() => () => setSampleFlash(false), []);

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mb-3 flex max-w-[540px] gap-2 max-[520px]:flex-col max-[520px]:gap-2.5"
      >
        <div
          ref={wrapperRef}
          className={`relative flex min-h-[48px] min-w-0 flex-1 items-center overflow-hidden rounded-[10px] border bg-bg-3 transition-[border-color,box-shadow] duration-200 focus-within:border-coral focus-within:shadow-[0_0_0_4px_rgba(255,91,62,0.15)] ${
            sampleFlash
              ? "border-coral shadow-[0_0_0_4px_rgba(255,91,62,0.15)]"
              : "border-line-strong"
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yourbusiness.com"
            aria-label="Business domain"
            className="w-full rounded-[10px] border-none bg-transparent px-4 py-3.5 font-sans text-[16px] text-ink outline-none placeholder:text-ink-3"
          />
          {/* Coral hairline sweep — only present while submitting. Pure
              transform on a 1px-tall element; bottom-anchored so it reads
              as the audit handing off, not as a progress bar. */}
          {submitting ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-coral to-transparent motion-safe:animate-submit-sweep motion-reduce:opacity-60"
            />
          ) : null}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border-none bg-ink px-[22px] py-3.5 font-sans text-[15px] font-semibold text-bg transition-all duration-150 hover:-translate-y-px hover:bg-coral disabled:cursor-not-allowed disabled:opacity-60 max-[520px]:w-full"
        >
          {submitting ? "Starting…" : (
            <>
              Check my score
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </form>

      {/* Point-of-commit reassurance. Editorial aside in Geist (not mono),
          adjacent to the action so the visitor reads it as they commit.
          The eyebrow up top says "no signup"; restating it next to the
          button is where the trust actually lands for the skeptical
          scanner. */}
      <p className="mt-3 max-w-[540px] text-[13px] leading-[1.55] text-ink-2">
        You’ll watch the audit happen, then see a real report you can keep. No
        email, no signup, about twelve seconds.
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
        <span>Or try a sample:</span>
        <button
          type="button"
          onClick={fillSample}
          className="cursor-pointer border-none bg-transparent p-0 font-sans text-ink-2 underline decoration-line-strong underline-offset-[3px] transition-all duration-150 hover:text-coral hover:decoration-coral"
        >
          {SAMPLE_DOMAIN}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] text-red" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
