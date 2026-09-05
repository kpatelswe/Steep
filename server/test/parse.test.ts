import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseFeedXml } from "../src/feeds/parse";

const now = new Date("2026-09-08T12:00:00Z");
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("parseFeedXml", () => {
  it("parses Google News items: publisher from <source>, suffix stripped, link lists dropped, stale items skipped", async () => {
    const items = await parseFeedXml(fixture("google-news.xml"), {
      feedUrl: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en",
      feedLabel: "Google News",
      now,
    });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Apple unveils new M5 MacBook Pro with 24-hour battery",
      source: "The Verge",
      snippet: null,
      imageUrl: null,
    });
    expect(items[1]!.title).toBe("Apple's M5 MacBook Pro promises 24-hour battery life");
    expect(items[1]!.source).toBe("CNBC");
    expect(items[0]!.publishedAt.toISOString()).toBe("2026-09-08T11:30:00.000Z");
  });

  it("parses a publisher Atom feed: image from media:content, snippet from content, tiny titles skipped", async () => {
    const items = await parseFeedXml(fixture("publisher-atom.xml"), {
      feedUrl: "https://www.theverge.com/rss/index.xml",
      feedLabel: "The Verge",
      now,
    });
    expect(items).toHaveLength(1);
    const it0 = items[0]!;
    expect(it0.title).toBe("Apple’s new MacBook Pro has a 24-hour battery and an M5 chip");
    expect(it0.source).toBe("The Verge");
    expect(it0.imageUrl).toBe("https://cdn.verge.example/m5.jpg");
    expect(it0.snippet).toMatch(/^Apple has announced the M5 MacBook Pro/);
    expect(it0.snippet!.length).toBeLessThanOrEqual(201);
    // tracking params must not change identity
    expect(it0.urlHash).toBe((await parseFeedXml(fixture("publisher-atom.xml").replace("?utm_source=rss&amp;utm_medium=feed", ""), { feedUrl: "x", feedLabel: "The Verge", now }))[0]!.urlHash);
  });
});
