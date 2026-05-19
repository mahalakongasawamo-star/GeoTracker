import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";

// Signed unsubscribe token: <subscriptionId>.<expirySeconds>.<sig>.
// Decoupled from sessions so an email link works without a logged-in browser.

const TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

function sign(value: string): string {
  return createHmac("sha256", env.SESSION_SECRET + ":pulse").update(value).digest("base64url");
}

export function buildUnsubscribeToken(subscriptionId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const body = `${subscriptionId}.${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [subscriptionId, expStr, sig] = parts as [string, string, string];
  const body = `${subscriptionId}.${expStr}`;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return subscriptionId;
}

export function buildUnsubscribeUrl(subscriptionId: string): string {
  return `${env.API_ORIGIN}/pulse/unsubscribe?token=${buildUnsubscribeToken(subscriptionId)}`;
}
