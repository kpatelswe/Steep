import { describe, expect, it } from "vitest";
import { cleanSnippet, cleanTitle, hashUrl, jaccard, tokenizeTitle } from "../src/feeds/normalize";

describe("hashUrl", () => {
  it("ignores tracking params, www, hash and trailing slash", () => {
    const a = hashUrl("https://www.example.com/story/?utm_source=rss&utm_medium=feed#top");
    const b = hashUrl("https://example.com/story");
    expect(a).toBe(b);
  });
  it("keeps meaningful query params", () => {
    expect(hashUrl("https://example.com/a?id=1")).not.toBe(hashUrl("https://example.com/a?id=2"));
  });
});

describe("cleanTitle", () => {
  it("strips a Google News publisher suffix", () => {
    expect(cleanTitle("Apple unveils M5 - The Verge", { fromGoogleNews: true })).toBe("Apple unveils M5");
  });
  it("strips the suffix when it matches the source even off Google News", () => {
    expect(cleanTitle("Apple unveils M5 - CNBC", { source: "cnbc" })).toBe("Apple unveils M5");
  });
  it("keeps dashes that are part of the headline", () => {
    expect(cleanTitle("Dow ends higher - what it means for the long-term investor", { source: "MarketWatch" })).toBe(
      "Dow ends higher - what it means for the long-term investor",
    );
  });
  it("decodes entities and collapses whitespace", () => {
    expect(cleanTitle("Apple&#39;s   big\n day")).toBe("Apple's big day");
  });
});

describe("cleanSnippet", () => {
  it("returns null for Google News link lists", () => {
    expect(cleanSnippet('<ol><li><a href="https://news.google.com/x">A</a></li></ol>')).toBeNull();
  });
  it("strips html, decodes entities and truncates at a word boundary with an ellipsis", () => {
    const long = `<p>${"word ".repeat(80)}&amp; more</p>`;
    const s = cleanSnippet(long)!;
    expect(s.length).toBeLessThanOrEqual(201);
    expect(s.endsWith("…")).toBe(true);
    expect(s).not.toContain("<p>");
  });
  it("returns null for very short blurbs", () => {
    expect(cleanSnippet("<p>hi</p>")).toBeNull();
  });
});

describe("tokenizeTitle / jaccard", () => {
  it("drops stopwords, possessives and punctuation", () => {
    expect([...tokenizeTitle("Apple's new M5 MacBook Pro: the battery lasts 24 hours")]).toEqual([
      "apple",
      "macbook",
      "pro",
      "battery",
      "lasts",
      "hours",
    ]);
  });
  it("scores overlapping headlines highly and unrelated ones low", () => {
    const a = tokenizeTitle("Apple unveils M5 MacBook Pro with 24-hour battery");
    const b = tokenizeTitle("Apple's M5 MacBook Pro promises 24-hour battery life");
    const c = tokenizeTitle("Raptors trade for a new point guard");
    expect(jaccard(a, b)).toBeGreaterThanOrEqual(0.45);
    expect(jaccard(a, c)).toBe(0);
  });
});
