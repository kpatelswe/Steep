import { Router } from "express";
import rateLimit from "express-rate-limit";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { config, isProd } from "../config";
import { db } from "../db/client";
import { userTopics } from "../db/schema";
import { renderMagicLink } from "../emails/render";
import { logger } from "../logger";
import { sendEmail } from "../mail/mailer";
import { tinyPage } from "../pages";
import { MAGIC_LINK_MINUTES, consumeMagicLink, createMagicLink, normalizeEmail } from "./magicLink";
import { clearSessionCookie, setSessionCookie, signSession } from "./session";

export const authRouter = Router();

const requestSchema = z.object({ email: z.string().trim().email().max(254) });

const ipLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const emailLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => normalizeEmail(String((req.body as { email?: string })?.email ?? "")),
  validate: { keyGeneratorIpFallback: false },
});

authRouter.post("/api/auth/request", ipLimiter, emailLimiter, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  const { token, isNewUser, user } = await createMagicLink(parsed.data.email);
  const url = `${config.APP_URL}/api/auth/verify?token=${token}`;
  const rendered = await renderMagicLink({ url, expiresInMinutes: MAGIC_LINK_MINUTES, isNewUser });
  try {
    const result = await sendEmail({ to: user.email, subject: rendered.subject, html: rendered.html, text: rendered.text });
    // In local dev with no email provider, hand the link back so the flow is testable.
    res.json({ ok: true, ...(result.dryRun && !isProd ? { devLink: url } : {}) });
  } catch (err) {
    logger.error({ err }, "magic link send failed");
    res.status(502).json({ error: "We couldn't send the email. Try again in a minute." });
  }
});

authRouter.get("/api/auth/verify", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const user = token ? await consumeMagicLink(token) : null;
  if (!user) {
    res
      .status(400)
      .send(tinyPage({ title: "That link has expired", body: "Sign-in links work once and last 15 minutes. Request a fresh one.", cta: { href: `${config.APP_URL}/`, label: "Back to Steep" } }));
    return;
  }
  setSessionCookie(res, await signSession(user.id));
  const [row] = await db.select({ n: count() }).from(userTopics).where(eq(userTopics.userId, user.id));
  res.redirect((row?.n ?? 0) > 0 ? "/home" : "/follow");
});

authRouter.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
