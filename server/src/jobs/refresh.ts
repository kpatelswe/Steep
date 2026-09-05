import { refreshAllFeeds, type RefreshStats } from "../feeds/fetcher";

export function runRefresh(now = new Date()): Promise<RefreshStats> {
  return refreshAllFeeds({ now });
}
