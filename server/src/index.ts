import { createApp } from "./app";
import { config, isServerless } from "./config";
import { startDevCron } from "./jobs/devCron";
import { logger } from "./logger";

const app = createApp();

if (!isServerless) {
  app.listen(config.PORT, () => {
    logger.info(`Steep listening on ${config.APP_URL} (port ${config.PORT})`);
  });
  if (process.env.DISABLE_CRON !== "1") startDevCron();
}

// Vercel's zero-config Express support picks up the default export.
export default app;
