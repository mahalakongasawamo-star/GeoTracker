import { env } from "../env.js";

export interface PulseEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  ok: boolean;
  id?: string;
  reason?: string;
}

export async function sendEmail(email: PulseEmail): Promise<EmailSendResult> {
  if (!env.RESEND_API_KEY) {
    // Dev fallback: log to stderr. Tests and local runs work without a key.
    console.warn(`[pulse-mock] -> ${email.to}: ${email.subject}`);
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
    }),
  });
  if (!res.ok) return { ok: false, reason: `resend ${res.status}` };
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}
