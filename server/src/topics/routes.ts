import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "../auth/session";
import { db } from "../db/client";
import { articles, topicFeeds, topics, userTopics } from "../db/schema";
import { refreshTopic } from "../feeds/fetcher";
import { CUSTOM_TOPIC_ACCENT, googleNewsSearchFeed } from "../feeds/sources";
import { logger } from "../logger";

export const topicsRouter = Router();

/** Followed topics per reader, curated and custom together. Keeps issues short and feed fetching bounded. */
export const MAX_TOPICS = 10;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Curated topics with the freshest headline each, for the Follow page. */
topicsRouter.get("/api/topics", async (req, res) => {
  const curated = await db.select().from(topics).where(eq(topics.kind, "curated")).orderBy(topics.name);
  const latest = await db
    .selectDistinctOn([articles.topicId], { topicId: articles.topicId, title: articles.title, source: articles.source })
    .from(articles)
    .where(inArray(articles.topicId, curated.map((t) => t.id)))
    .orderBy(articles.topicId, desc(articles.publishedAt));
  const headline = new Map(latest.map((l) => [l.topicId, { title: l.title, source: l.source }]));
  const followed = req.user
    ? new Set((await db.select({ id: userTopics.topicId }).from(userTopics).where(eq(userTopics.userId, req.user.id))).map((r) => r.id))
    : new Set<string>();
  res.json({
    topics: curated.map((t) => ({ id: t.id, slug: t.slug, name: t.name, accent: t.accent, latest: headline.get(t.id) ?? null, followed: followed.has(t.id) })),
  });
});

const customSchema = z.object({ name: z.string().trim().min(2).max(40) });

/** "Follow anything": a custom topic backed by a Google News search feed. */
topicsRouter.post("/api/topics/custom", requireUser, async (req, res) => {
  const parsed = customSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Give the topic a name between 2 and 40 characters" });
    return;
  }
  const name = parsed.data.name.replace(/\s+/g, " ");
  const slug = slugify(name);
  if (!slug) {
    res.status(400).json({ error: "Use letters or numbers in the topic name" });
    return;
  }
  const [followedCount] = await db.select({ n: sql<number>`count(*)::int` }).from(userTopics).where(eq(userTopics.userId, req.user!.id));
  if ((followedCount?.n ?? 0) >= MAX_TOPICS) {
    res.status(400).json({ error: `You can follow up to ${MAX_TOPICS} topics. Unfollow one first.` });
    return;
  }
  let [topic] = await db.select().from(topics).where(eq(topics.slug, slug)).limit(1);
  let created = false;
  if (!topic) {
    [topic] = await db.insert(topics).values({ slug, name, kind: "custom", query: name, accent: CUSTOM_TOPIC_ACCENT, createdBy: req.user!.id }).returning();
    await db.insert(topicFeeds).values({ topicId: topic!.id, url: googleNewsSearchFeed(name), label: "Google News" }).onConflictDoNothing();
    created = true;
  }
  await db.insert(userTopics).values({ userId: req.user!.id, topicId: topic!.id }).onConflictDoNothing();
  if (created) {
    // Fill it right away so the first issue is not empty. Bounded by the feed timeout.
    try {
      await refreshTopic(topic!.id);
    } catch (err) {
      logger.warn({ err, slug }, "initial refresh of custom topic failed");
    }
  }
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(articles).where(eq(articles.topicId, topic!.id));
  res.status(created ? 201 : 200).json({ topic: { id: topic!.id, slug: topic!.slug, name: topic!.name, accent: topic!.accent, kind: topic!.kind, weight: 5, articleCount: countRow?.n ?? 0 } });
});

const followSchema = z.object({ topicIds: z.array(z.string().uuid()).min(1).max(MAX_TOPICS) });

/** Replace the followed set; weights of kept topics survive. */
topicsRouter.put("/api/me/topics", requireUser, async (req, res) => {
  const parsed = followSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `Pick between 1 and ${MAX_TOPICS} topics` });
    return;
  }
  const userId = req.user!.id;
  const wanted = new Set(parsed.data.topicIds);
  await db.transaction(async (tx) => {
    const current = await tx.select({ id: userTopics.topicId }).from(userTopics).where(eq(userTopics.userId, userId));
    const toRemove = current.map((c) => c.id).filter((id) => !wanted.has(id));
    if (toRemove.length) await tx.delete(userTopics).where(and(eq(userTopics.userId, userId), inArray(userTopics.topicId, toRemove)));
    if (wanted.size) await tx.insert(userTopics).values([...wanted].map((topicId) => ({ userId, topicId }))).onConflictDoNothing();
  });
  res.json({ ok: true });
});

const weightSchema = z.object({ weight: z.number().int().min(1).max(7) });

topicsRouter.patch("/api/me/topics/:topicId", requireUser, async (req, res) => {
  const parsed = weightSchema.safeParse(req.body);
  const topicId = z.string().uuid().safeParse(req.params.topicId);
  if (!parsed.success || !topicId.success) {
    res.status(400).json({ error: "Weight must be between 1 and 7" });
    return;
  }
  const [row] = await db
    .update(userTopics)
    .set({ weight: parsed.data.weight })
    .where(and(eq(userTopics.userId, req.user!.id), eq(userTopics.topicId, topicId.data)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "You don't follow that topic" });
    return;
  }
  res.json({ ok: true, weight: row.weight });
});
