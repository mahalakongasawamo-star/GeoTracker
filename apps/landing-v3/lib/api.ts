// Client-side wrappers for the Fastify audit endpoint. Behavior matches
// apps/web's lib/api.ts; the M4 port brought the running + result views
// in-house so /audit/[id] lives here now instead of the (no-longer-deployed)
// Astro app.

import type { AuditDetail, ProgressEvent } from "@geotracker/shared";

export interface StartAuditInput {
  domain: string;
  businessName?: string;
  city?: string;
  industrySlug?: string;
}

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";

const WEB_ORIGIN =
  process.env.NEXT_PUBLIC_WEB_ORIGIN ?? "http://localhost:4321";

export async function startAudit(input: StartAuditInput): Promise<{ id: string }> {
  const res = await fetch(`${API_ORIGIN}/audits`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`audit failed: ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

export async function getAudit(id: string): Promise<AuditDetail> {
  const res = await fetch(`${API_ORIGIN}/audits/${id}`);
  if (!res.ok) throw new Error(`audit fetch failed: ${res.status}`);
  return res.json() as Promise<AuditDetail>;
}

export function streamAudit(id: string, onEvent: (e: ProgressEvent) => void): () => void {
  const es = new EventSource(`${API_ORIGIN}/audits/${id}/stream`);
  es.onmessage = (m) => {
    try {
      onEvent(JSON.parse(m.data) as ProgressEvent);
    } catch {
      /* malformed frame; SSE will redeliver if it was important */
    }
  };
  return () => es.close();
}

// Same-origin link from the AuditForm post-submit. WEB_ORIGIN is kept
// pluggable in case the audit detail page ever moves to a separate
// deploy again (it lived on apps/web from M1 through pre-M4).
export function auditDetailUrl(id: string): string {
  return `${WEB_ORIGIN}/audit/${id}`;
}
