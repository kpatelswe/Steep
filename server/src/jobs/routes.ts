import { timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { waitUntil } from "@vercel/functions";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { runRefresh } from "./refresh.js";
import { runSendDue } from "./sendDue.js";

export const jobsRouter = Router();

function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = config.CRON_SECRET;
  const ok = token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!ok) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/**
 * Jobs answer 202 immediately and finish in the background, so an external
 * cron with a short timeout (cron-job.org: 30 s) never cuts them off. On
 * Vercel, waitUntil keeps the function alive until the work settles.
 */
function runInBackground(name: string, work: () => Promise<unknown>): void {
  const p = work().catch((err: unknown) => logger.error({ err, job: name }, "job failed"));
  waitUntil(p);
}

jobsRouter.post("/jobs/refresh", requireCronSecret, (_req, res) => {
  runInBackground("refresh", () => runRefresh());
  res.status(202).json({ accepted: "refresh" });
});

jobsRouter.post("/jobs/send", requireCronSecret, (_req, res) => {
  runInBackground("send", () => runSendDue());
  res.status(202).json({ accepted: "send" });
});

/** Synchronous variants for local debugging: wait for the stats. */
jobsRouter.post("/jobs/refresh/sync", requireCronSecret, async (_req, res) => {
  res.json(await runRefresh());
});

jobsRouter.post("/jobs/send/sync", requireCronSecret, async (_req, res) => {
  res.json(await runSendDue());
});
