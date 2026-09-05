import { describe, expect, it } from "vitest";
import { digestSubject } from "../src/emails/DigestEmail";
import { sampleDigest } from "../src/emails/fixtures";
import { renderDigest, renderMagicLink } from "../src/emails/render";

describe("DigestEmail", () => {
  it("renders every story with a tracked link and the coverage badge only for 3+ sources", async () => {
    const { html, text } = await renderDigest(sampleDigest);
    for (const t of sampleDigest.topics) {
      expect(html).toContain(`${t.stories.length} things in ${t.name}`);
      for (const s of t.stories) expect(html).toContain(`href="${s.url}"`);
    }
    expect(html.match(/covering this/g)?.length).toBe(3);
    expect(html).toContain("Steeped for 23h 40m");
    expect(html).toContain("Day 12 streak");
    expect(html).toContain("Quiet day in Science");
    expect(text).toContain("Apple’s new MacBook Pro");
    expect(text).toContain("Unsubscribe");
  });

  it("writes a subject that names the topics and count", () => {
    expect(digestSubject(sampleDigest)).toBe("13 things in Technology, World, Formula 1");
    expect(digestSubject({ ...sampleDigest, topics: [], totalStories: 0 })).toMatch(/^Quiet morning/);
  });

  it("omits the streak and steeped line on a first issue", async () => {
    const { html } = await renderDigest({ ...sampleDigest, steepedFor: null, streakDays: 1 });
    expect(html).toContain("Your first steep");
    expect(html).not.toContain("streak");
  });

  it("is stable (snapshot)", async () => {
    const { html } = await renderDigest(sampleDigest);
    expect(html).toMatchSnapshot();
  });
});

describe("MagicLinkEmail", () => {
  it("includes the link and expiry", async () => {
    const { html, subject } = await renderMagicLink({ url: "https://x/verify?token=abc", expiresInMinutes: 15, isNewUser: false });
    expect(subject).toBe("Sign in to Steep");
    expect(html).toContain('href="https://x/verify?token=abc"');
    expect(html).toContain("expires in 15 minutes");
  });
});
