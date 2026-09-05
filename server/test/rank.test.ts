import { describe, expect, it } from "vitest";
import { rankTopic, type RankCandidate } from "../src/feeds/rank";

const now = new Date("2026-09-08T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 36e5);
const c = (id: string, over: Partial<RankCandidate> = {}): RankCandidate => ({
  id,
  source: over.source ?? id,
  publishedAt: over.publishedAt ?? hoursAgo(2),
  hasImage: over.hasImage ?? false,
  clusterKey: over.clusterKey ?? null,
  clusterSize: over.clusterSize ?? 1,
});

describe("rankTopic", () => {
  it("prefers widely covered stories over merely recent ones", () => {
    const picks = rankTopic([c("fresh", { publishedAt: hoursAgo(0.5) }), c("big", { clusterSize: 4, publishedAt: hoursAgo(10) })], 2, { now });
    expect(picks[0]!.id).toBe("big");
  });

  it("keeps one representative per cluster", () => {
    const picks = rankTopic(
      [c("a", { clusterKey: "k", clusterSize: 3 }), c("b", { clusterKey: "k", clusterSize: 3 }), c("z")],
      5,
      { now },
    );
    expect(picks.map((p) => p.id).sort()).toEqual(["a", "z"]);
  });

  it("enforces one story per source when possible, then backfills", () => {
    const picks = rankTopic(
      [
        c("v1", { source: "Verge", publishedAt: hoursAgo(1) }),
        c("v2", { source: "Verge", publishedAt: hoursAgo(2) }),
        c("v3", { source: "Verge", publishedAt: hoursAgo(3) }),
        c("cnbc", { source: "CNBC", publishedAt: hoursAgo(20) }),
      ],
      3,
      { now },
    );
    expect(picks.map((p) => p.id)).toEqual(["v1", "cnbc", "v2"]);
  });

  it("promotes the best illustrated story to lead", () => {
    const picks = rankTopic([c("text", { publishedAt: hoursAgo(0.1) }), c("pic", { hasImage: true, publishedAt: hoursAgo(12) })], 2, {
      now,
    });
    expect(picks[0]!.id).toBe("pic");
    expect(picks[1]!.id).toBe("text");
  });

  it("respects the requested count and handles empty input", () => {
    expect(rankTopic([], 5, { now })).toEqual([]);
    expect(rankTopic([c("a"), c("b"), c("c")], 2, { now })).toHaveLength(2);
  });
});
