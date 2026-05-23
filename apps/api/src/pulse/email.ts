import { env } from "../env.js";

export interface PulseEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Provider-passthrough headers (e.g. List-Unsubscribe). */
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  ok: boolean;
  id?: string;
  reason?: string;
}

export async function sendEmail(email: PulseEmail): Promise<EmailSendResult> {
  if (!env.RESEND_API_KEY) {
    // Dev fallback: log to stderr. Tests and local runs work without a key.
    // Surface the List-Unsubscribe URL so the Gate-5 mock-mode runbook
    // (docs/VERIFICATION.md) can extract the token without a real inbox.
    const unsub = email.headers?.["List-Unsubscribe"];
    console.warn(`[pulse-mock] -> ${email.to}: ${email.subject}${unsub ? ` | unsubscribe=${unsub}` : ""}`);
    return { ok: true, id: "mock" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.PULSE_FROM_EMAIL,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
    }),
  });
  if (!res.ok) return { ok: false, reason: `resend ${res.status}` };
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}
