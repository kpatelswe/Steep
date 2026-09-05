import { sql } from "../db/client.js";
import { refreshAllFeeds } from "./fetcher.js";

const stats = await refreshAllFeeds();
console.table(stats);
await sql.end();
