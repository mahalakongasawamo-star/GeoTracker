import type { FastifyInstance } from "fastify";
import oauthPlugin, { type OAuth2Namespace } from "@fastify/oauth2";
import { eq } from "drizzle-orm";
import { loadUser, requireAuth } from "../auth/decorate.js";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { businesses, pulseSubscriptions, users } from "../db/schema.js";
import { upsertOAuthUser } from "../auth/upsertUser.js";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  buildSessionCookieValue,
} from "../auth/session.js";

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2?: OAuth2Namespace;
    linkedinOAuth2?: OAuth2Namespace;
  }
}

async function fetchGoogleProfile(accessToken: string) {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google userinfo: ${res.status}`);
  const j = (await res.json()) as { sub: string; email: string; name?: string };
  return j;
}

async function fetchLinkedInProfile(accessToken: string) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`linkedin userinfo: ${res.status}`);
  const j = (await res.json()) as { sub: string; email: string; name?: string };
  return j;
}

export async function authRoutes(app: FastifyInstance) {
  const callbackBase = env.API_ORIGIN;

  if (env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) {
    await app.register(oauthPlugin, {
      name: "googleOAuth2",
      scope: ["openid", "email", "profile"],
      credentials: {
        client: {
          id: env.GOOGLE_OAUTH_CLIENT_ID,
          secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        },
        auth: oauthPlugin.GOOGLE_CONFIGURATION,
      },
      startRedirectPath: "/auth/google",
      callbackUri: `${callbackBase}/auth/google/callback`,
    });

    app.get("/auth/google/callback", async (req, reply) => {
      const token = await app.googleOAuth2!.getAccessTokenFromAuthorizationCodeFlow(req);
      const profile = await fetchGoogleProfile(token.token.access_token);
      const user = await upsertOAuthUser({
        provider: "google",
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
      });
      reply.setCookie(SESSION_COOKIE, buildSessionCookieValue(user.id), SESSION_COOKIE_OPTIONS);
      return reply.redirect(`${env.WEB_ORIGIN[0]}/dashboard`);
    });
  }

  if (env.LINKEDIN_OAUTH_CLIENT_ID && env.LINKEDIN_OAUTH_CLIENT_SECRET) {
    await app.register(oauthPlugin, {
      name: "linkedinOAuth2",
      scope: ["openid", "email", "profile"],
      credentials: {
        client: {
          id: env.LINKEDIN_OAUTH_CLIENT_ID,
          secret: env.LINKEDIN_OAUTH_CLIENT_SECRET,
        },
        auth: {
          authorizeHost: "https://www.linkedin.com",
          authorizePath: "/oauth/v2/authorization",
          tokenHost: "https://www.linkedin.com",
          tokenPath: "/oauth/v2/accessToken",
        },
      },
      startRedirectPath: "/auth/linkedin",
      callbackUri: `${callbackBase}/auth/linkedin/callback`,
    });

    app.get("/auth/linkedin/callback", async (req, reply) => {
      const token = await app.linkedinOAuth2!.getAccessTokenFromAuthorizationCodeFlow(req);
      const profile = await fetchLinkedInProfile(token.token.access_token);
      const user = await upsertOAuthUser({
        provider: "linkedin",
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
      });
      reply.setCookie(SESSION_COOKIE, buildSessionCookieValue(user.id), SESSION_COOKIE_OPTIONS);
      return reply.redirect(`${env.WEB_ORIGIN[0]}/dashboard`);
    });
  }

  // /auth/me needs an attempt to read the cookie; it never throws on miss.
  app.get("/auth/me", { preHandler: loadUser }, async (req) => {
    if (!req.user) return { user: null };
    return {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        tier: req.user.tier,
      },
    };
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  // GDPR / CCPA right-to-delete. Cascades to businesses (and thus audits +
  // audit_results) via the FK and explicitly purges pulse_subscriptions.
  app.delete("/me", { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user!;
    await db.delete(pulseSubscriptions).where(eq(pulseSubscriptions.userId, user.id));
    await db.delete(businesses).where(eq(businesses.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });

  // Dev-only impersonation endpoint per SOW v1.1 §5 AC-7. Enabled in
  // non-production by default. To enable in production (emergency
  // support only) set ALLOW_DEV_LOGIN=true explicitly — every request
  // is logged and the override is announced at boot.
  //
  // The v1.0 escape that opened the gate on VERCEL_ENV=preview is
  // removed. Previews now rely on Vercel Deployment Protection or an
  // explicit ALLOW_DEV_LOGIN=true (SOW v1.1 §8.2 step 5).
  const isProduction = env.NODE_ENV === "production";
  const allowDevLoginOverride = process.env.ALLOW_DEV_LOGIN === "true";
  const devLoginEnabled = !isProduction || allowDevLoginOverride;

  // Hard boot guard. If devLoginEnabled ever ends up true in production
  // without the override, the logic above has been broken — blow up the
  // boot rather than silently expose the endpoint.
  if (isProduction && devLoginEnabled && !allowDevLoginOverride) {
    throw new Error(
      "BOOT GUARD: /auth/dev-login cannot be enabled in production without ALLOW_DEV_LOGIN=true",
    );
  }
  if (isProduction && allowDevLoginOverride) {
    app.log.warn(
      "DEV LOGIN ENABLED IN PRODUCTION via ALLOW_DEV_LOGIN=true — every use logged at warn",
    );
  }

  // Surface which providers are actually configured so the web UI can
  // hide buttons that would 404.
  app.get("/auth/providers", async () => ({
    google: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET),
    linkedin: Boolean(env.LINKEDIN_OAUTH_CLIENT_ID && env.LINKEDIN_OAUTH_CLIENT_SECRET),
    dev: devLoginEnabled,
  }));

  if (devLoginEnabled) {
    app.get<{ Querystring: { email?: string; name?: string } }>(
      "/auth/dev-login",
      async (req, reply) => {
        const email = (req.query.email ?? "").trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return reply.code(400).send({ error: "email_required" });
        }
        const name = req.query.name?.trim() || null;

        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let userId: string;
        if (existing[0]) {
          userId = existing[0].id;
        } else {
          const inserted = await db
            .insert(users)
            .values({ email, name })
            .returning({ id: users.id });
          userId = inserted[0]!.id;
        }

        app.log.warn({ email, userId }, "DEV LOGIN — never enable in production");
        reply.setCookie(SESSION_COOKIE, buildSessionCookieValue(userId), SESSION_COOKIE_OPTIONS);
        return reply.redirect(`${env.WEB_ORIGIN[0]}/dashboard`);
      },
    );
  }
}
