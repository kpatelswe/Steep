import pLimit from "p-limit";
import { and, eq, gte, inArray, lt, notExists, sql } from "drizzle-orm";
import { db } from "../db/client";
import { articles, clicks, digestArticles, topicFeeds, topics, userTopics, users } from "../db/schema";
import { logger } from "../logger";
import { clusterArticles } from "./cluster";
import { tokenizeTitle } from "./normalize";
import { MAX_AGE_HOURS, fetchFeedXml, parseFeedXml } from "./parse";

interface FeedRow {
  topicId: string;
  url: string;
  label: string;
}

async function refreshFeeds(feeds: FeedRow[], now: Date, limit = pLimit(6)): Promise<{ failedFeeds: number; parsed: number; inserted: number }> {
  let failedFeeds = 0;
  let parsed = 0;
  let inserted = 0;
  await Promise.all(
    feeds.map((feed) =>
      limit(async () => {
        try {
          const xml = await fetchFeedXml(feed.url);
          const items = await parseFeedXml(xml, { feedUrl: feed.url, feedLabel: feed.label, now });
          parsed += items.length;
          if (items.length === 0) return;
          const rows = await db
            .insert(articles)
            .values(items.map((i) => ({ ...i, topicId: feed.topicId })))
            .onConflictDoNothing({ target: [articles.topicId, articles.urlHash] })
            .returning({ id: articles.id });
          inserted += rows.length;
          logger.debug({ feed: feed.label, parsed: items.length, inserted: rows.length }, "feed refreshed");
        } catch (err) {
          failedFeeds++;
          logger.warn({ feed: feed.label, url: feed.url, err: (err as Error).message }, "feed failed");
        }
      }),
    ),
  );
  return { failedFeeds, parsed, inserted };
}

/** Refresh one topic's feeds and recluster it. Used right after a custom topic is created. */
export async function refreshTopic(topicId: string, now = new Date()): Promise<{ inserted: number; failedFeeds: number }> {
  const feeds = await db
    .select({ topicId: topicFeeds.topicId, url: topicFeeds.url, label: topicFeeds.label })
    .from(topicFeeds)
    .where(eq(topicFeeds.topicId, topicId));
  const r = await refreshFeeds(feeds, now);
  await reclusterTopic(topicId, now);
  return { inserted: r.inserted, failedFeeds: r.failedFeeds };
}

export interface RefreshStats {
  topics: number;
  feeds: number;
  failedFeeds: number;
  parsed: number;
  inserted: number;
  clustered: number;
  purged: number;
  ms: number;
}

/**
 * Refresh every topic anyone follows (plus all curated topics, so the landing
 * sample and onboarding headlines are always populated).
 */
export async function refreshAllFeeds(opts: { concurrency?: number; now?: Date } = {}): Promise<RefreshStats> {
  const started = Date.now();
  const now = opts.now ?? new Date();
  const limit = pLimit(opts.concurrency ?? 6);

  const followedCustom = db
    .select({ id: userTopics.topicId })
    .from(userTopics)
    .innerJoin(users, eq(users.id, userTopics.userId))
    .where(eq(users.active, true));
  const targetTopics = await db
    .select({ id: topics.id, slug: topics.slug })
    .from(topics)
    .where(sql`${topics.kind} = 'curated' or ${topics.id} in ${followedCustom}`);
  if (targetTopics.length === 0) return { topics: 0, feeds: 0, failedFeeds: 0, parsed: 0, inserted: 0, clustered: 0, purged: 0, ms: 0 };

  const feeds = await db
    .select({ id: topicFeeds.id, topicId: topicFeeds.topicId, url: topicFeeds.url, label: topicFeeds.label })
    .from(topicFeeds)
    .where(inArray(topicFeeds.topicId, targetTopics.map((t) => t.id)));

  const { failedFeeds, parsed, inserted } = await refreshFeeds(feeds, now, limit);

  let clustered = 0;
  for (const t of targetTopics) clustered += await reclusterTopic(t.id, now);

  const purged = await purgeOldArticles(now);

  const stats: RefreshStats = {
    topics: targetTopics.length,
    feeds: feeds.length,
    failedFeeds,
    parsed,
    inserted,
    clustered,
    purged,
    ms: Date.now() - started,
  };
  logger.info(stats, "refresh complete");
  return stats;
}

/** Recompute story clusters for one topic over the fresh window. Returns articles in multi-source clusters. */
export async function reclusterTopic(topicId: string, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - MAX_AGE_HOURS * 36e5);
  const rows = await db
    .select({ id: articles.id, title: articles.title, source: articles.source })
    .from(articles)
    .where(and(eq(articles.topicId, topicId), gte(articles.publishedAt, since)));
  if (rows.length === 0) return 0;

  const result = clusterArticles(rows.map((r) => ({ id: r.id, source: r.source, tokens: tokenizeTitle(r.title) })));
  let multi = 0;
  const byKey = new Map<string, { size: number; ids: string[] }>();
  for (const [id, r] of result) {
    const entry = byKey.get(r.clusterKey) ?? { size: r.clusterSize, ids: [] };
    entry.ids.push(id);
    byKey.set(r.clusterKey, entry);
    if (r.clusterSize > 1) multi++;
  }
  await db.transaction(async (tx) => {
    for (const [key, { size, ids }] of byKey) {
      await tx
        .update(articles)
        .set({ clusterKey: size > 1 ? key : null, clusterSize: size })
        .where(inArray(articles.id, ids));
    }
  });
  return multi;
}

/** Drop stale articles nobody was sent and nobody clicked, so the free-tier DB stays small. */
export async function purgeOldArticles(now = new Date(), maxAgeDays = 30): Promise<number> {
  const cutoff = new Date(now.getTime() - maxAgeDays * 864e5);
  const rows = await db
    .delete(articles)
    .where(
      and(
        lt(articles.publishedAt, cutoff),
        notExists(db.select({ x: sql`1` }).from(digestArticles).where(eq(digestArticles.articleId, articles.id))),
        notExists(db.select({ x: sql`1` }).from(clicks).where(eq(clicks.articleId, articles.id))),
      ),
    )
    .returning({ id: articles.id });
  return rows.length;
}
