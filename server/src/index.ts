import { createApp } from "./app";
import { config, isServerless } from "./config";
import { logger } from "./logger";

const app = createApp();

if (!isServerless) {
  app.listen(config.PORT, () => {
    logger.info(`Steep listening on ${config.APP_URL} (port ${config.PORT})`);
  });
}

// Vercel's zero-config Express support picks up the default export.
export default app;
