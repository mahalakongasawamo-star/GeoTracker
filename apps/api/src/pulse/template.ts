import { env } from "../env.js";

export interface PulseTemplateInput {
  recipientEmail: string;
  businessDomain: string;
  businessName?: string;
  currentScore: number;
  previousScore: number | null;
  auditId: string;
  unsubscribeUrl: string;
}

function delta(curr: number, prev: number | null): string {
  if (prev == null) return "First report — we'll trend this from now on.";
  const d = curr - prev;
  if (d > 0) return `▲ Up ${d} points since last month.`;
  if (d < 0) return `▼ Down ${Math.abs(d)} points since last month.`;
  return "Flat since last month.";
}

export function buildPulseEmail(input: PulseTemplateInput): { html: string; text: string; subject: string } {
  const display = input.businessName ?? input.businessDomain;
  const headline = `${display} — AI visibility score: ${input.currentScore}/100`;
  const trend = delta(input.currentScore, input.previousScore);
  const auditUrl = `${env.WEB_ORIGIN}/audit/${input.auditId}`;

  const text = [
    headline,
    trend,
    "",
    `View the full audit: ${auditUrl}`,
    "",
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="color:#0b6cba; font-size:12px; font-weight:600; letter-spacing:1px; text-transform:uppercase;">
        Monthly Pulse Report
      </p>
      <h1 style="margin: 8px 0 4px; font-size: 22px; color:#0f172a;">${escapeHtml(display)}</h1>
      <p style="margin: 0 0 16px; color:#475569;">${escapeHtml(input.businessDomain)}</p>
      <div style="background:#f1f5f9; padding:20px; border-radius:12px; text-align:center;">
        <div style="font-size:48px; font-weight:700; color:#0f172a;">${input.currentScore}<span style="color:#94a3b8; font-size:24px;">/100</span></div>
        <div style="color:#475569; font-size:14px; margin-top:4px;">${escapeHtml(trend)}</div>
      </div>
      <p style="margin: 20px 0; color:#334155; line-height:1.5;">
        AI engines re-ranked your industry this month. Open the full audit to see
        which prompts moved, where competitors got ahead, and what to fix first.
      </p>
      <a href="${auditUrl}" style="display:inline-block; background:#0b6cba; color:#fff; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:600;">
        View full audit
      </a>
      <p style="margin-top:24px; color:#64748b; font-size:12px;">
        You're receiving this because you opted into monthly Pulse Reports.
        <a href="${input.unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a>.
      </p>
    </div>`;

  return { html, text, subject: headline };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
