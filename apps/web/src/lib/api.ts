import type { AuditDetail, ProgressEvent } from "@geotracker/shared";

const API_ORIGIN = import.meta.env.PUBLIC_API_ORIGIN ?? "http://localhost:4000";

export interface StartAuditInput {
  domain: string;
  businessName?: string;
  city?: string;
  industrySlug?: string;
}

export async function startAudit(input: StartAuditInput): Promise<{ id: string }> {
  const res = await fetch(`${API_ORIGIN}/audits`, {
    method: "POST",
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
      /* ignore */
    }
  };
  return () => es.close();
}
