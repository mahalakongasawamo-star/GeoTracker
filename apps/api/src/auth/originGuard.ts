import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

// Defense in depth against CSRF: state-changing requests must originate from
// our web origin. Session cookies are sameSite=lax, which blocks cross-site
// top-level POSTs, but we still want this guard for in-app subresources.
// OAuth callbacks come from the providers' origins, so they're exempt.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PREFIXES = ["/auth/google", "/auth/linkedin"];

export async function originGuard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (SAFE_METHODS.has(req.method)) return;
  if (EXEMPT_PREFIXES.some((p) => req.url.startsWith(p))) return;

  const origin = (req.headers.origin as string | undefined) ?? "";
  const referer = (req.headers.referer as string | undefined) ?? "";

  if (origin && env.WEB_ORIGIN.includes(origin)) return;
  if (referer && env.WEB_ORIGIN.some((o) => referer.startsWith(o))) return;

  // Allow curl / server-to-server when no Origin/Referer is set.
  // Browsers always set Origin for cross-origin POSTs.
  if (!origin && !referer) return;

  return reply.code(403).send({ error: "origin_not_allowed" });
}
