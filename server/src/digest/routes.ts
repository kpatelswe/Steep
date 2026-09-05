import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireUser } from "../auth/session.js";
import { config } from "../config.js";
import { renderDigest } from "../emails/render.js";
import { verify } from "../engage/links.js";
import { tinyPage } from "../pages.js";
import { buildDigest, buildSampleDigest, rebuildSentDigest } from "./build.js";
import { sendDigestToUser } from "./send.js";

export const digestRouter = Router();

/** Today's issue for the signed-in reader, rendered in the browser. Nothing is recorded. */
digestRouter.get("/api/digest/preview", requireUser, async (req, res) => {
  const built = await buildDigest(req.user!);
  const { html } = await renderDigest(built.data);
  res.type("html").send(html);
});

digestRouter.get("/api/digest/preview.json", requireUser, async (req, res) => {
  const built = await buildDigest(req.user!);
  res.json({ hasStories: built.hasStories, ...built.data });
});

let sampleCache: { at: number; html: string } | null = null;
const SAMPLE_TTL_MS = 10 * 60_000;

/** A real issue built from live articles, for the landing page. Cached briefly. */
digestRouter.get("/api/digest/sample", async (_req, res) => {
  if (!sampleCache || Date.now() - sampleCache.at > SAMPLE_TTL_MS) {
    const data = await buildSampleDigest();
    const { html } = await renderDigest(data);
    sampleCache = { at: Date.now(), html };
  }
  res.type("html").set("cache-control", "public, max-age=300").send(sampleCache.html);
});

const sendNowLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 1,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? "anon",
  validate: { keyGeneratorIpFallback: false },
  message: { error: "You already asked for one in the last 10 minutes. Check your inbox." },
});

/** "Send my first steep now." */
digestRouter.post("/api/digest/send-now", requireUser, sendNowLimiter, async (req, res) => {
  const outcome = await sendDigestToUser(req.user!, { kind: "manual" });
  if (outcome.status === "failed") {
    res.status(502).json({ error: "We couldn't send it. Try again in a minute.", outcome });
    return;
  }
  res.json({ outcome });
});

/** View in browser. Owner session or the signed link from the email. */
digestRouter.get("/d/:digestId", async (req, res) => {
  const digestId = String(req.params.digestId);
  const sig = typeof req.query.s === "string" ? req.query.s : undefined;
  const data = await rebuildSentDigest(digestId);
  if (!data) {
    res.status(404).send(tinyPage({ title: "Issue not found", body: "That issue isn't in our archive.", cta: { href: `${config.APP_URL}/home`, label: "Back to Steep" } }));
    return;
  }
  const allowed = verify(sig, "d", digestId) || Boolean(req.user && data.links.unsubscribe.endsWith(req.user.unsubscribeToken));
  if (!allowed) {
    res.status(403).send(tinyPage({ title: "Sign in to view this issue", body: "Open it from the link in your email, or sign in first.", cta: { href: `${config.APP_URL}/`, label: "Sign in" } }));
    return;
  }
  const { html } = await renderDigest(data);
  res.type("html").send(html);
});
