import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export interface UpsertUserInput {
  provider: "google" | "linkedin";
  sub: string;
  email: string;
  name?: string;
}

export interface UpsertedUser {
  id: string;
  email: string;
  tier: "free" | "premium" | "ultra";
}

export async function upsertOAuthUser(input: UpsertUserInput): Promise<UpsertedUser> {
  const existing = await db
    .select({ id: users.id, email: users.email, tier: users.tier })
    .from(users)
    .where(
      and(eq(users.oauthProvider, input.provider), eq(users.oauthSub, input.sub)),
    )
    .limit(1);

  if (existing[0]) return existing[0];

  // Maybe the user logged in previously with a different provider but same
  // email — link to that account.
  const byEmail = await db
    .select({ id: users.id, email: users.email, tier: users.tier })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1);

  if (byEmail[0]) {
    await db
      .update(users)
      .set({ oauthProvider: input.provider, oauthSub: input.sub, name: input.name ?? null })
      .where(eq(users.id, byEmail[0].id));
    return byEmail[0];
  }

  const inserted = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      oauthProvider: input.provider,
      oauthSub: input.sub,
    })
    .returning({ id: users.id, email: users.email, tier: users.tier });

  return inserted[0]!;
}
