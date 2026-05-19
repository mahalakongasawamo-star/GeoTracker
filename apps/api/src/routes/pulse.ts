import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { pulseSubscriptions, users } from "../db/schema.js";
import { verifyUnsubscribeToken } from "../pulse/unsubscribe.js";

export async function pulseRoutes(app: FastifyInstance) {
  // One-click unsubscribe via signed token in email. No login required.
  app.get("/pulse/unsubscribe", async (req, reply) => {
    const { token } = z
      .object({ token: z.string().min(10) })
      .parse(req.query);
    const subscriptionId = verifyUnsubscribeToken(token);
    if (!subscriptionId) return reply.code(400).send({ error: "invalid_token" });

    const row = await db
      .select({ userId: pulseSubscriptions.userId })
      .from(pulseSubscriptions)
      .where(eq(pulseSubscriptions.id, subscriptionId))
      .limit(1);

    await db
      .delete(pulseSubscriptions)
      .where(eq(pulseSubscriptions.id, subscriptionId));

    if (row[0]) {
      await db
        .update(users)
        .set({ pulseOptIn: false })
        .where(eq(users.id, row[0].userId));
    }

    return reply
      .header("content-type", "text/html; charset=utf-8")
      .send(
        `<html><body style="font-family:sans-serif; padding:40px; max-width:480px;">
          <h1>Unsubscribed.</h1>
          <p>You won't receive any more GeoTracker Pulse Reports.</p>
        </body></html>`,
      );
  });
}
