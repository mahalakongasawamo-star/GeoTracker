// Client-side wrapper for the Fastify audit endpoint. The same shape and
// behavior as apps/web's startAudit (apps/web/src/lib/api.ts), kept local
// here so this app stays standalone and doesn't import from the Astro app.

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

// Built per the design doc's flow: form submit → POST → redirect. M3 only
// owns the landing, so we cross-redirect to the existing Astro detail page
// at apps/web/src/pages/audit/[id].astro. M4 will replace this with the
// /audits/[id]/running route once that exists.
export function auditDetailUrl(id: string): string {
  return `${WEB_ORIGIN}/audit/${id}`;
}
