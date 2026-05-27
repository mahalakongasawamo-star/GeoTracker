"use client";

import { useRef, useState } from "react";
import { auditDetailUrl, startAudit } from "@/lib/api";

// The hero form. Visually 1:1 with the .audit-form / .form-helpers block in
// the Aurum mockup; behaviorally identical to apps/web's existing
// startAudit flow. On success cross-redirects to the Astro app's
// /audit/[id] (see lib/api.ts note about M4 owning the new /running route).

export default function AuditForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  function fillSample() {
    if (inputRef.current) {
      inputRef.current.value = "aurumspa.com";
      inputRef.current.focus();
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mb-3 flex max-w-[540px] gap-2 max-[520px]:flex-col max-[520px]:gap-2.5"
      >
        <div className="relative flex min-h-[48px] min-w-0 flex-1 items-center rounded-[10px] border border-line-strong bg-bg-3 transition-[border-color,box-shadow] duration-200 focus-within:border-coral focus-within:shadow-[0_0_0_4px_rgba(255,91,62,0.15)]">
          <input
            ref={inputRef}
            type="text"
            placeholder="yourbusiness.com"
            aria-label="Business domain"
            className="w-full rounded-[10px] border-none bg-transparent px-4 py-3.5 font-sans text-[16px] text-ink outline-none placeholder:text-ink-3"
          />
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

      <div className="mt-3.5 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
        <span>Or try a sample:</span>
        <button
          type="button"
          onClick={fillSample}
          className="cursor-pointer border-none bg-transparent p-0 font-sans text-ink-2 underline decoration-line-strong underline-offset-[3px] transition-all duration-150 hover:text-coral hover:decoration-coral"
        >
          aurumspa.com
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
