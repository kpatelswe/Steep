import { refreshAllFeeds, type RefreshStats } from "../feeds/fetcher.js";

export function runRefresh(now = new Date()): Promise<RefreshStats> {
  return refreshAllFeeds({ now });
}
