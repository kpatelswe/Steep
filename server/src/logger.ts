import pino from "pino";
import { isProd } from "./config";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});
