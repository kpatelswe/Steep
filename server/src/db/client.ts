import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config, isServerless } from "../config.js";
import * as schema from "./schema.js";

export const sql = postgres(config.DATABASE_URL, {
  // One connection per serverless instance; a small pool for a long-lived process.
  max: isServerless ? 1 : 10,
  // Neon's pooled endpoint (pgbouncer) does not support prepared statements.
  prepare: false,
});

export const db = drizzle(sql, { schema });
export type Db = typeof db;
