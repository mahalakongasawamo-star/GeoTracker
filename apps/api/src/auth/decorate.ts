import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { SESSION_COOKIE, readUserIdFromCookie } from "./session.js";

export interface SessionUser {
  id: string;
  email: string;
  tier: "free" | "premium" | "ultra";
  name: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

export async function attachUser(req: FastifyRequest): Promise<void> {
  req.user = null;
  const raw = req.cookies?.[SESSION_COOKIE];
  const uid = readUserIdFromCookie(raw);
  if (!uid) return;
  const row = await db
    .select({ id: users.id, email: users.email, tier: users.tier, name: users.name })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1);
  req.user = row[0] ?? null;
}

export function registerUserDecorator(app: FastifyInstance) {
  app.decorateRequest("user", null);
  app.addHook("preHandler", attachUser);
}

export function requireUser(req: FastifyRequest): SessionUser {
  if (!req.user) {
    const err = new Error("unauthorized");
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  return req.user;
}
