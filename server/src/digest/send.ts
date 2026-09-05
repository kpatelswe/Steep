import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { digestArticles, digests, type User } from "../db/schema";
import { renderDigest } from "../emails/render";
import { unsubscribeUrl } from "../engage/links";
import { logger } from "../logger";
import { sendEmail } from "../mail/mailer";
import { buildDigest } from "./build";

export type SendOutcome =
  | { status: "sent"; digestId: string; articleCount: number; dryRun: boolean }
  | { status: "skipped_empty"; digestId: string }
  | { status: "duplicate" }
  | { status: "failed"; digestId: string; error: string };

/**
 * Build, record, and send one issue. The digest row is inserted *before* the
 * email goes out so a retried cron tick can never double-send a morning issue
 * (the partial unique index on (user, local_date) for scheduled issues).
 */
export async function sendDigestToUser(user: User, opts: { kind: "scheduled" | "manual"; now?: Date }): Promise<SendOutcome> {
  const now = opts.now ?? new Date();
  const built = await buildDigest(user, { now });

  const [row] = await db
    .insert(digests)
    .values({
      userId: user.id,
      localDate: built.localDate,
      kind: opts.kind,
      sentAt: now,
      status: built.hasStories ? "sent" : "skipped_empty",
      articleCount: built.data.totalStories,
    })
    .onConflictDoNothing()
    .returning({ id: digests.id });
  if (!row) return { status: "duplicate" };
  if (!built.hasStories) {
    logger.info({ userId: user.id }, "digest skipped: nothing fresh");
    return { status: "skipped_empty", digestId: row.id };
  }

  try {
    // Re-point the view-in-browser link at the row we just created.
    const rebuilt = await buildDigest(user, { now, digestId: row.id });
    const rendered = await renderDigest(rebuilt.data);
    const unsub = unsubscribeUrl(user.unsubscribeToken);
    const result = await sendEmail({
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    await db.transaction(async (tx) => {
      if (rebuilt.picks.length) {
        await tx.insert(digestArticles).values(rebuilt.picks.map((p) => ({ digestId: row.id, ...p })));
      }
      await tx.update(digests).set({ providerMessageId: result.id, articleCount: rebuilt.data.totalStories }).where(eq(digests.id, row.id));
    });
    logger.info({ userId: user.id, digestId: row.id, stories: rebuilt.data.totalStories, dryRun: result.dryRun }, "digest sent");
    return { status: "sent", digestId: row.id, articleCount: rebuilt.data.totalStories, dryRun: result.dryRun };
  } catch (err) {
    const error = (err as Error).message;
    logger.error({ userId: user.id, digestId: row.id, error }, "digest failed");
    await db.update(digests).set({ status: "failed", error }).where(eq(digests.id, row.id));
    return { status: "failed", digestId: row.id, error };
  }
}
