import { eq } from "drizzle-orm";
import { db, sql } from "./client.js";
import { topicFeeds, topics } from "./schema.js";
import { CURATED_TOPICS } from "../feeds/sources.js";

for (const t of CURATED_TOPICS) {
  const [row] = await db
    .insert(topics)
    .values({ slug: t.slug, name: t.name, kind: "curated", accent: t.accent })
    .onConflictDoUpdate({ target: topics.slug, set: { name: t.name, accent: t.accent } })
    .returning({ id: topics.id });
  const topicId = row?.id ?? (await db.select({ id: topics.id }).from(topics).where(eq(topics.slug, t.slug)))[0]!.id;

  for (const f of t.feeds) {
    await db.insert(topicFeeds).values({ topicId, url: f.url, label: f.label }).onConflictDoNothing();
  }
  console.log(`seeded ${t.name} (${t.feeds.length} feeds)`);
}

await sql.end();
