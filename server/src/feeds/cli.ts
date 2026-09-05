import { sql } from "../db/client";
import { refreshAllFeeds } from "./fetcher";

const stats = await refreshAllFeeds();
console.table(stats);
await sql.end();
