import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";

const COOKIE = "gt_session";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface Payload {
  uid: string;
  exp: number; // unix seconds
}

function sign(value: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(value).digest("base64url");
}

function encode(payload: Payload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(raw: string): Payload | null {
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;

export function buildSessionCookieValue(userId: string): string {
  return encode({ uid: userId, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS });
}

export function readUserIdFromCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const payload = decode(raw);
  return payload?.uid ?? null;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: TTL_SECONDS,
};
