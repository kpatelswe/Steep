import { existsSync } from "node:fs";
import { join } from "node:path";
import cookieParser from "cookie-parser";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { authRouter } from "./auth/routes.js";
import { attachUser } from "./auth/session.js";
import { sql as rawSql } from "./db/client.js";
import { digestRouter } from "./digest/routes.js";
import { engageRouter } from "./engage/routes.js";
import { jobsRouter } from "./jobs/routes.js";
import { logger } from "./logger.js";
import { topicsRouter } from "./topics/routes.js";
import { usersRouter } from "./users/routes.js";

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

  app.use(jobsRouter);
  app.use(attachUser);
  app.use(authRouter);
  app.use(topicsRouter);
  app.use(usersRouter);
  app.use(digestRouter);
  app.use(engageRouter);

  // Built SPA, when present (production). Vite dev server proxies to us otherwise.
  // Dev/VPS: the Vite build next to the server. Docker: copied to ./public. (Vercel serves public/ itself.)
  const candidates = [join(process.cwd(), "..", "client", "dist"), join(process.cwd(), "client", "dist"), join(process.cwd(), "public")];
  const dist = candidates.find((d) => existsSync(join(d, "index.html"))) ?? null;
  if (dist) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.get(/^\/(?!api\/|jobs\/|r\/|d\/|f$|unsubscribe\/|health$).*/, (_req, res) => {
      // Hashed assets are immutable; the shell must always be revalidated or a
      // browser can keep an index.html that points at assets from an old build.
      res.set("cache-control", "no-cache");
      res.sendFile(join(dist, "index.html"));
    });
  }

  app.use((req, res) => {
    if (req.path.startsWith("/api/")) res.status(404).json({ error: "Not found" });
    else res.status(404).type("text").send("Not found");
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "unhandled error");
    if (res.headersSent) return;
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
