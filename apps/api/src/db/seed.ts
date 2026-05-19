import { INDUSTRIES, PROMPT_SETS, getPromptSet } from "@geotracker/shared";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { industries, promptSets } from "./schema.js";

async function main() {
  for (const def of INDUSTRIES) {
    const existing = await db
      .select({ id: industries.id })
      .from(industries)
      .where(eq(industries.slug, def.slug))
      .limit(1);

    let industryId: string;
    if (existing[0]) {
      industryId = existing[0].id;
    } else {
      const inserted = await db
        .insert(industries)
        .values({
          slug: def.slug,
          displayName: def.displayName,
          defaultRadiusMiles: def.defaultRadiusMiles,
        })
        .returning({ id: industries.id });
      industryId = inserted[0]!.id;
    }

    const prompts = getPromptSet(def.slug);
    const setRow = await db
      .select({ id: promptSets.id })
      .from(promptSets)
      .where(eq(promptSets.industryId, industryId))
      .limit(1);

    if (setRow[0]) {
      await db
        .update(promptSets)
        .set({ prompts })
        .where(eq(promptSets.id, setRow[0].id));
    } else {
      await db.insert(promptSets).values({ industryId, prompts });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✓ seeded ${INDUSTRIES.length} industries / prompt sets`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
