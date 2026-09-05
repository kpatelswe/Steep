import { describe, expect, it } from "vitest";
import { feedbackUrl, sign, trackedArticleUrl, verify } from "../src/engage/links";

describe("signed links", () => {
  it("verifies its own signatures and rejects tampering", () => {
    const s = sign("r", "user", "article");
    expect(verify(s, "r", "user", "article")).toBe(true);
    expect(verify(s, "r", "user", "other")).toBe(false);
    expect(verify(undefined, "r", "user", "article")).toBe(false);
    expect(verify("short", "r", "user", "article")).toBe(false);
  });
  it("builds urls that carry a valid signature", () => {
    const u = new URL(trackedArticleUrl("u1", "a1"));
    expect(u.pathname).toBe("/r/a1");
    expect(verify(u.searchParams.get("s")!, "r", "u1", "a1")).toBe(true);
    const f = new URL(feedbackUrl("u1", "t1", "less"));
    expect(verify(f.searchParams.get("s")!, "f", "u1", "t1", "less")).toBe(true);
  });
});
