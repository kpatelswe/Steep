import { and, eq, exists, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { digests, userTopics, users } from "../db/schema.js";
import { sendDigestToUser, type SendOutcome } from "../digest/send.js";
import { isDue, localDate } from "../digest/time.js";
import { logger } from "../logger.js";

export interface SendDueStats {
  considered: number;
  due: number;
  sent: number;
  skippedEmpty: number;
  duplicate: number;
  failed: number;
  ms: number;
}

/**
 * The hourly tick. Every active reader whose local clock has reached their
 * send hour, and who has no scheduled issue for today, gets one.
 */
export async function runSendDue(now = new Date()): Promise<SendDueStats> {
  const started = Date.now();
  const candidates = await db
    .select()
    .from(users)
    .where(and(eq(users.active, true), exists(db.select({ x: sql`1` }).from(userTopics).where(eq(userTopics.userId, users.id)))));

  const stats: SendDueStats = { considered: candidates.length, due: 0, sent: 0, skippedEmpty: 0, duplicate: 0, failed: 0, ms: 0 };
  for (const user of candidates) {
    const today = localDate(now, user.timezone);
    const [existing] = await db
      .select({ id: digests.id })
      .from(digests)
      .where(and(eq(digests.userId, user.id), eq(digests.localDate, today), eq(digests.kind, "scheduled")))
      .limit(1);
    if (!isDue(user, now, Boolean(existing))) continue;
    stats.due++;
    let outcome: SendOutcome;
    try {
      outcome = await sendDigestToUser(user, { kind: "scheduled", now });
    } catch (err) {
      logger.error({ err, userId: user.id }, "send tick crashed for user");
      stats.failed++;
      continue;
    }
    if (outcome.status === "sent") stats.sent++;
    else if (outcome.status === "skipped_empty") stats.skippedEmpty++;
    else if (outcome.status === "duplicate") stats.duplicate++;
    else stats.failed++;
  }
  stats.ms = Date.now() - started;
  logger.info(stats, "send tick complete");
  return stats;
}
