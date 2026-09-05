import cookieParser from "cookie-parser";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { sql as rawSql } from "./db/client";
import { logger } from "./logger";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path === "/health") return;
      logger.info({ method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }, "req");
    });
    next();
  });

  app.get("/health", async (_req, res) => {
    try {
      await rawSql`select 1`;
      res.json({ ok: true, db: true });
    } catch (err) {
      logger.error({ err }, "health check failed");
      res.status(503).json({ ok: false, db: false });
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "unhandled error");
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
