import cron from "node-cron";
import { logger } from "../logger.js";
import { runRefresh } from "./refresh.js";
import { runSendDue } from "./sendDue.js";

/**
 * In-process scheduler for long-lived deployments (local dev, a VPS). On
 * Vercel this never runs; cron-job.org hits /jobs/* instead.
 */
export function startDevCron(): void {
  cron.schedule("0 * * * *", () => void runRefresh().catch((err: unknown) => logger.error({ err }, "refresh failed")));
  cron.schedule("10 * * * *", () => void runSendDue().catch((err: unknown) => logger.error({ err }, "send tick failed")));
  logger.info("in-process cron started: refresh at :00, send at :10");
}
