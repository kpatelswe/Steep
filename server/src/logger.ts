import pino from "pino";
import { isProd, isServerless } from "./config";

// Pretty output only for a local terminal. Serverless platforms capture plain JSON
// lines, and pino's pretty transport needs a worker thread plus a dev-only package.
const pretty = !isProd && !isServerless && process.env.PRETTY_LOGS !== "0";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  ...(pretty ? { transport: { target: "pino-pretty", options: { colorize: true } } } : {}),
});
