import { Router } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "../auth/session.js";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { clicks, digests, topics, userTopics, users } from "../db/schema.js";
import { isValidTimezone, localDate, streakDays } from "../digest/time.js";
import { tinyPage } from "../pages.js";

export const usersRouter = Router();

usersRouter.get("/api/me", requireUser, async (req, res) => {
  const u = req.user!;
  const followed = await db
    .select({ id: topics.id, slug: topics.slug, name: topics.name, accent: topics.accent, kind: topics.kind, weight: userTopics.weight })
    .from(userTopics)
    .innerJoin(topics, eq(topics.id, userTopics.topicId))
    .where(eq(userTopics.userId, u.id))
    .orderBy(userTopics.followedAt);
  const [last] = await db
    .select({ id: digests.id, sentAt: digests.sentAt, status: digests.status, articleCount: digests.articleCount })
    .from(digests)
    .where(eq(digests.userId, u.id))
    .orderBy(desc(digests.sentAt))
    .limit(1);
  res.json({
    user: { email: u.email, timezone: u.timezone, sendHour: u.sendHour, active: u.active },
    topics: followed,
    lastDigest: last ?? null,
  });
});

const patchSchema = z.object({
  timezone: z.string().refine(isValidTimezone, "Unknown timezone").optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  active: z.boolean().optional(),
});

usersRouter.patch("/api/me", requireUser, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" });
    return;
  }
  const [row] = await db.update(users).set(parsed.data).where(eq(users.id, req.user!.id)).returning();
  res.json({ user: { email: row!.email, timezone: row!.timezone, sendHour: row!.sendHour, active: row!.active } });
});

/** "Your month": what the reader actually does with their issues. */
usersRouter.get("/api/me/stats", requireUser, async (req, res) => {
  const u = req.user!;
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 864e5);
  const [sentRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(digests)
    .where(and(eq(digests.userId, u.id), eq(digests.status, "sent"), gte(digests.sentAt, since30)));
  const [openedRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(clicks)
    .where(and(eq(clicks.userId, u.id), gte(clicks.clickedAt, since30)));
  const byTopic = await db
    .select({ id: topics.id, name: topics.name, accent: topics.accent, n: sql<number>`count(*)::int` })
    .from(clicks)
    .innerJoin(topics, eq(topics.id, clicks.topicId))
    .where(and(eq(clicks.userId, u.id), gte(clicks.clickedAt, since30)))
    .groupBy(topics.id)
    .orderBy(desc(sql`count(*)`));
  const history = await db
    .select({ localDate: digests.localDate })
    .from(digests)
    .where(and(eq(digests.userId, u.id), eq(digests.status, "sent")))
    .orderBy(desc(digests.sentAt))
    .limit(90);
  const today = localDate(now, u.timezone);
  const dates = new Set(history.map((h) => h.localDate));
  // Streak counts up to today or, before today's issue has gone out, up to yesterday.
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);
  const streak = dates.has(today) ? streakDays(dates, today) : streakDays(dates, yesterday);
  const daily = await db
    .select({ day: sql<string>`to_char(${clicks.clickedAt} at time zone ${u.timezone}, 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(clicks)
    .where(and(eq(clicks.userId, u.id), gte(clicks.clickedAt, new Date(now.getTime() - 14 * 864e5))))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  res.json({
    issuesReceived: sentRow!.n,
    storiesOpened: openedRow!.n,
    topTopics: byTopic.slice(0, 5),
    streakDays: streak,
    dailyOpens: daily,
  });
});

/** One-click unsubscribe (GET from the footer link, POST from List-Unsubscribe-Post). */
async function unsubscribe(token: string): Promise<boolean> {
  const [row] = await db.update(users).set({ active: false }).where(eq(users.unsubscribeToken, token)).returning({ id: users.id });
  return Boolean(row);
}

usersRouter.get("/unsubscribe/:token", async (req, res) => {
  const ok = await unsubscribe(String(req.params.token));
  res
    .status(ok ? 200 : 404)
    .send(
      ok
        ? tinyPage({ title: "You're unsubscribed", body: "No more morning issues. Your topics are saved if you ever want to come back.", cta: { href: `${config.APP_URL}/home`, label: "Resume anytime" } })
        : tinyPage({ title: "Link not recognized", body: "That unsubscribe link doesn't match an account.", cta: { href: `${config.APP_URL}/`, label: "Back to Steep" } }),
    );
});

usersRouter.post("/unsubscribe/:token", async (req, res) => {
  const ok = await unsubscribe(String(req.params.token));
  res.status(ok ? 200 : 404).json({ ok });
});
