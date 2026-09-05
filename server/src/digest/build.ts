import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "../db/client";
import { articles, clicks, digestArticles, digests, topics, userTopics, users, type User } from "../db/schema";
import type { DigestData, EmailStory, EmailTopic } from "../emails/types";
import { feedbackUrl, sign, trackedArticleUrl, unsubscribeUrl } from "../engage/links";
import { config } from "../config";
import { rankTopic } from "../feeds/rank";
import {
  dateLabel,
  formatDuration,
  greetingFor,
  localDate,
  localHour,
  readMinutes,
  sentAtLabel,
  streakDays,
  timeAgo,
} from "./time";

export const MIN_STORIES_PER_TOPIC = 2;
export const FRESH_HOURS = 24;
export const SUGGEST_EVERY_N_ISSUES = 7;

export interface DigestPick {
  articleId: string;
  topicId: string;
  position: number;
}

export interface BuiltDigest {
  data: DigestData;
  picks: DigestPick[];
  localDate: string;
  hasStories: boolean;
}

export function viewDigestUrl(digestId: string): string {
  return `${config.APP_URL}/d/${digestId}?s=${sign("d", digestId)}`;
}

/** Everything the email needs for one user, right now. Pure of side effects. */
export async function buildDigest(user: User, opts: { now?: Date; digestId?: string } = {}): Promise<BuiltDigest> {
  const now = opts.now ?? new Date();
  const tz = user.timezone;
  const today = localDate(now, tz);
  const fresh = new Date(now.getTime() - FRESH_HOURS * 36e5);

  const followed = await db
    .select({ id: topics.id, name: topics.name, accent: topics.accent, kind: topics.kind, weight: userTopics.weight, followedAt: userTopics.followedAt })
    .from(userTopics)
    .innerJoin(topics, eq(topics.id, userTopics.topicId))
    .where(eq(userTopics.userId, user.id));

  // Topic order: what this reader actually opens, then follow order.
  const clickRows = await db
    .select({ topicId: clicks.topicId, n: sql<number>`count(*)::int` })
    .from(clicks)
    .where(and(eq(clicks.userId, user.id), gte(clicks.clickedAt, new Date(now.getTime() - 30 * 864e5))))
    .groupBy(clicks.topicId);
  const clicksByTopic = new Map(clickRows.map((r) => [r.topicId, r.n]));
  followed.sort((a, b) => (clicksByTopic.get(b.id) ?? 0) - (clicksByTopic.get(a.id) ?? 0) || a.followedAt.getTime() - b.followedAt.getTime());

  // Never repeat a story this reader has already been sent.
  const sentRows = await db
    .select({ articleId: digestArticles.articleId })
    .from(digestArticles)
    .innerJoin(digests, eq(digests.id, digestArticles.digestId))
    .where(and(eq(digests.userId, user.id), gte(digests.sentAt, new Date(now.getTime() - 7 * 864e5))));
  const alreadySent = new Set(sentRows.map((r) => r.articleId));

  const emailTopics: EmailTopic[] = [];
  const quietTopics: string[] = [];
  const picks: DigestPick[] = [];

  for (const [ti, t] of followed.entries()) {
    const candidates = await db
      .select()
      .from(articles)
      .where(and(eq(articles.topicId, t.id), gte(articles.publishedAt, fresh)))
      .orderBy(desc(articles.publishedAt))
      .limit(300);
    const ranked = rankTopic(
      candidates.filter((a) => !alreadySent.has(a.id)).map((a) => ({ ...a, hasImage: Boolean(a.imageUrl) })),
      Math.min(7, Math.max(1, t.weight)),
      { now, horizonHours: FRESH_HOURS },
    );
    if (ranked.length < MIN_STORIES_PER_TOPIC) {
      quietTopics.push(t.name);
      continue;
    }
    const stories: EmailStory[] = ranked.map((a) => ({
      id: a.id,
      title: a.title,
      url: trackedArticleUrl(user.id, a.id),
      source: a.source,
      timeAgo: timeAgo(a.publishedAt, now),
      snippet: a.snippet,
      imageUrl: a.imageUrl,
      clusterSize: a.clusterSize,
    }));
    ranked.forEach((a, si) => picks.push({ articleId: a.id, topicId: t.id, position: ti * 10 + si }));
    emailTopics.push({
      id: t.id,
      name: t.name,
      accent: t.accent,
      stories,
      moreUrl: feedbackUrl(user.id, t.id, "more"),
      lessUrl: feedbackUrl(user.id, t.id, "less"),
    });
  }

  // History: steeping time, streak, and whether this is a "suggest something" issue.
  // The row for the issue being built may already exist (it is inserted before
  // sending so retries can't double-send); it must not count as "the last issue".
  const history = await db
    .select({ localDate: digests.localDate, sentAt: digests.sentAt })
    .from(digests)
    .where(and(eq(digests.userId, user.id), eq(digests.status, "sent"), opts.digestId ? ne(digests.id, opts.digestId) : sql`true`))
    .orderBy(desc(digests.sentAt))
    .limit(90);
  const last = history[0];
  const steepedFor = last ? formatDuration(now.getTime() - last.sentAt.getTime()) : null;
  const streak = streakDays([...history.map((h) => h.localDate), today], today);
  const issueNumber = history.length + 1;

  let suggestions: DigestData["suggestions"] = [];
  if (issueNumber % SUGGEST_EVERY_N_ISSUES === 0) {
    const followedIds = followed.map((f) => f.id);
    const popular = await db
      .select({ id: topics.id, name: topics.name, slug: topics.slug, n: sql<number>`count(${clicks.id})::int` })
      .from(topics)
      .leftJoin(clicks, and(eq(clicks.topicId, topics.id), gte(clicks.clickedAt, new Date(now.getTime() - 30 * 864e5))))
      .where(and(eq(topics.kind, "curated"), followedIds.length ? sql`${topics.id} not in ${followedIds}` : sql`true`))
      .groupBy(topics.id)
      .orderBy(desc(sql`count(${clicks.id})`), topics.name)
      .limit(3);
    suggestions = popular.map((p) => ({ name: p.name, url: `${config.APP_URL}/follow?add=${p.slug}` }));
  }

  const totalStories = emailTopics.reduce((n, t) => n + t.stories.length, 0);
  const data: DigestData = {
    dateLabel: dateLabel(now, tz),
    greeting: greetingFor(localHour(now, tz)),
    steepedFor,
    streakDays: streak,
    totalStories,
    readMinutes: readMinutes(totalStories),
    topics: emailTopics,
    quietTopics,
    suggestions,
    links: {
      manage: `${config.APP_URL}/follow`,
      viewInBrowser: opts.digestId ? viewDigestUrl(opts.digestId) : `${config.APP_URL}/home`,
      unsubscribe: unsubscribeUrl(user.unsubscribeToken),
    },
    sentAtLabel: sentAtLabel(now, tz),
  };
  return { data, picks, localDate: today, hasStories: totalStories > 0 };
}

/** Re-create the issue that was actually sent, for "view in browser". */
export async function rebuildSentDigest(digestId: string): Promise<DigestData | null> {
  const [d] = await db.select().from(digests).where(eq(digests.id, digestId)).limit(1);
  if (!d) return null;
  const [user] = await db.select().from(users).where(eq(users.id, d.userId)).limit(1);
  if (!user) return null;
  const rows = await db
    .select({ position: digestArticles.position, article: articles, topic: topics })
    .from(digestArticles)
    .innerJoin(articles, eq(articles.id, digestArticles.articleId))
    .innerJoin(topics, eq(topics.id, digestArticles.topicId))
    .where(eq(digestArticles.digestId, digestId))
    .orderBy(digestArticles.position);

  const byTopic = new Map<string, EmailTopic>();
  for (const r of rows) {
    const t = byTopic.get(r.topic.id) ?? {
      id: r.topic.id,
      name: r.topic.name,
      accent: r.topic.accent,
      stories: [],
      moreUrl: feedbackUrl(user.id, r.topic.id, "more"),
      lessUrl: feedbackUrl(user.id, r.topic.id, "less"),
    };
    t.stories.push({
      id: r.article.id,
      title: r.article.title,
      url: trackedArticleUrl(user.id, r.article.id),
      source: r.article.source,
      timeAgo: timeAgo(r.article.publishedAt, d.sentAt),
      snippet: r.article.snippet,
      imageUrl: r.article.imageUrl,
      clusterSize: r.article.clusterSize,
    });
    byTopic.set(r.topic.id, t);
  }
  const emailTopics = [...byTopic.values()];
  const totalStories = emailTopics.reduce((n, t) => n + t.stories.length, 0);
  const history = await db
    .select({ localDate: digests.localDate })
    .from(digests)
    .where(and(eq(digests.userId, user.id), eq(digests.status, "sent"), lte(digests.sentAt, d.sentAt)));
  return {
    dateLabel: dateLabel(d.sentAt, user.timezone),
    greeting: greetingFor(localHour(d.sentAt, user.timezone)),
    steepedFor: null,
    streakDays: streakDays(history.map((h) => h.localDate), d.localDate),
    totalStories,
    readMinutes: readMinutes(totalStories),
    topics: emailTopics,
    quietTopics: [],
    suggestions: [],
    links: {
      manage: `${config.APP_URL}/follow`,
      viewInBrowser: viewDigestUrl(d.id),
      unsubscribe: unsubscribeUrl(user.unsubscribeToken),
    },
    sentAtLabel: sentAtLabel(d.sentAt, user.timezone),
  };
}

/** A public sample issue built from real articles, for the landing page. */
export async function buildSampleDigest(now = new Date(), slugs = ["technology", "world", "sports"]): Promise<DigestData> {
  const rows = await db.select().from(topics).where(inArray(topics.slug, slugs));
  const ordered = slugs.map((s) => rows.find((r) => r.slug === s)).filter((r): r is typeof rows[number] => Boolean(r));
  const fresh = new Date(now.getTime() - FRESH_HOURS * 36e5);
  const emailTopics: EmailTopic[] = [];
  for (const t of ordered) {
    const candidates = await db
      .select()
      .from(articles)
      .where(and(eq(articles.topicId, t.id), gte(articles.publishedAt, fresh)))
      .orderBy(desc(articles.publishedAt))
      .limit(300);
    const ranked = rankTopic(candidates.map((a) => ({ ...a, hasImage: Boolean(a.imageUrl) })), 5, { now, horizonHours: FRESH_HOURS });
    if (ranked.length < MIN_STORIES_PER_TOPIC) continue;
    emailTopics.push({
      id: t.id,
      name: t.name,
      accent: t.accent,
      moreUrl: `${config.APP_URL}/`,
      lessUrl: `${config.APP_URL}/`,
      stories: ranked.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        source: a.source,
        timeAgo: timeAgo(a.publishedAt, now),
        snippet: a.snippet,
        imageUrl: a.imageUrl,
        clusterSize: a.clusterSize,
      })),
    });
  }
  const totalStories = emailTopics.reduce((n, t) => n + t.stories.length, 0);
  const tz = "America/Toronto";
  return {
    dateLabel: dateLabel(now, tz),
    greeting: "Good morning.",
    steepedFor: "23h 40m",
    streakDays: 12,
    totalStories,
    readMinutes: readMinutes(totalStories),
    topics: emailTopics,
    quietTopics: [],
    suggestions: [],
    links: { manage: `${config.APP_URL}/`, viewInBrowser: `${config.APP_URL}/`, unsubscribe: `${config.APP_URL}/` },
    sentAtLabel: `7:00 AM Toronto time`,
  };
}
