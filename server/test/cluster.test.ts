import { describe, expect, it } from "vitest";
import { clusterArticles } from "../src/feeds/cluster";
import { tokenizeTitle } from "../src/feeds/normalize";

const item = (id: string, source: string, title: string) => ({ id, source, tokens: tokenizeTitle(title) });

describe("clusterArticles", () => {
  it("groups the same story from three publishers into a size-3 cluster", () => {
    const r = clusterArticles([
      item("a", "The Verge", "Apple unveils M5 MacBook Pro with 24-hour battery"),
      item("b", "CNBC", "Apple's M5 MacBook Pro promises 24-hour battery life"),
      item("c", "BBC", "Apple M5 MacBook Pro: 24-hour battery and new chip unveiled"),
      item("d", "ESPN", "Raptors trade for a new point guard"),
    ]);
    expect(r.get("a")!.clusterSize).toBe(3);
    expect(r.get("a")!.clusterKey).toBe(r.get("b")!.clusterKey);
    expect(r.get("c")!.clusterKey).toBe(r.get("a")!.clusterKey);
    expect(r.get("d")!.clusterSize).toBe(1);
    expect(r.get("d")!.clusterKey).not.toBe(r.get("a")!.clusterKey);
  });

  it("does not let one publisher inflate a cluster", () => {
    const r = clusterArticles([
      item("a", "The Verge", "Apple unveils M5 MacBook Pro with 24-hour battery"),
      item("b", "The Verge", "Apple unveils M5 MacBook Pro with 24-hour battery (updated)"),
    ]);
    expect(r.get("a")!.clusterSize).toBe(1);
    expect(r.get("b")!.clusterSize).toBe(1);
  });

  it("counts distinct sources, not members, when a publisher appears twice via a bridge", () => {
    const r = clusterArticles([
      item("a", "The Verge", "Apple unveils M5 MacBook Pro with 24-hour battery"),
      item("b", "CNBC", "Apple's M5 MacBook Pro promises 24-hour battery life"),
      item("c", "The Verge", "Apple's M5 MacBook Pro promises 24-hour battery"),
    ]);
    expect(r.get("a")!.clusterSize).toBe(2);
  });

  it("is deterministic in its keys", () => {
    const items = [item("x", "A", "one two three four"), item("y", "B", "one two three five")];
    expect(clusterArticles(items).get("x")!.clusterKey).toBe(clusterArticles([...items].reverse()).get("x")!.clusterKey);
  });
});
