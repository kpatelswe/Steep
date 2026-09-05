import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { articles, clicks, feedback, userTopics, topics } from "../db/schema.js";
import { logger } from "../logger.js";
import { tinyPage } from "../pages.js";
import { feedbackUrl, verify } from "./links.js";

export const engageRouter = Router();
const uuid = z.string().uuid();

/** Click tracking: record, then send the reader on to the publisher. Never block the redirect on bookkeeping. */
engageRouter.get("/r/:articleId", async (req, res) => {
  const articleId = uuid.safeParse(req.params.articleId);
  if (!articleId.success) {
    res.status(404).send(tinyPage({ title: "Story not found", body: "That link doesn't point at a story we know." }));
    return;
  }
  const [article] = await db.select({ url: articles.url, topicId: articles.topicId }).from(articles).where(eq(articles.id, articleId.data)).limit(1);
  if (!article) {
    res.status(404).send(tinyPage({ title: "Story not found", body: "This story is no longer in our archive, sorry.", cta: { href: `${config.APP_URL}/home`, label: "Back to Steep" } }));
    return;
  }
  const userId = typeof req.query.u === "string" ? req.query.u : "";
  const sig = typeof req.query.s === "string" ? req.query.s : undefined;
  if (uuid.safeParse(userId).success && verify(sig, "r", userId, articleId.data)) {
    db.insert(clicks)
      .values({ userId, articleId: articleId.data, topicId: article.topicId })
      .catch((err: unknown) => logger.warn({ err }, "click insert failed"));
  }
  res.redirect(302, article.url);
});

const dirSchema = z.enum(["more", "less"]);

/** More/less like this: one tap from the email, no sign-in. */
engageRouter.get("/f", async (req, res) => {
  const userId = typeof req.query.u === "string" ? req.query.u : "";
  const topicId = typeof req.query.t === "string" ? req.query.t : "";
  const dir = dirSchema.safeParse(req.query.d);
  const sig = typeof req.query.s === "string" ? req.query.s : undefined;
  if (!uuid.safeParse(userId).success || !uuid.safeParse(topicId).success || !dir.success || !verify(sig, "f", userId, topicId, dir.data)) {
    res.status(400).send(tinyPage({ title: "Link not recognized", body: "That feedback link doesn't check out. Open the email again and tap the link there." }));
    return;
  }
  const delta = dir.data === "more" ? 1 : -1;
  const [row] = await db
    .update(userTopics)
    .set({ weight: sql`least(7, greatest(1, ${userTopics.weight} + ${delta}))` })
    .where(and(eq(userTopics.userId, userId), eq(userTopics.topicId, topicId)))
    .returning({ weight: userTopics.weight });
  if (!row) {
    res.status(404).send(tinyPage({ title: "You don't follow that topic", body: "Nothing changed.", cta: { href: `${config.APP_URL}/follow`, label: "Manage topics" } }));
    return;
  }
  await db.insert(feedback).values({ userId, topicId, direction: dir.data });
  const [topic] = await db.select({ name: topics.name }).from(topics).where(eq(topics.id, topicId)).limit(1);
  const name = topic?.name ?? "that topic";
  const undo = feedbackUrl(userId, topicId, dir.data === "more" ? "less" : "more");
  res.send(
    tinyPage({
      title: dir.data === "more" ? `Got it. More ${name} tomorrow.` : `Got it. Less ${name} tomorrow.`,
      body: `Your next issue will carry ${row.weight} ${row.weight === 1 ? "story" : "stories"} in ${name}. Tap again on another morning to nudge it further.`,
      cta: { href: undo, label: "Undo" },
    }),
  );
});
