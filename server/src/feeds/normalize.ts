import { createHash } from "node:crypto";
import he from "he";
import normalizeUrl from "normalize-url";

const TRACKING_PARAMS = [/^utm_/i, /^fbclid$/i, /^gclid$/i, /^mc_/i, /^ref$/i, /^ns_/i, /^cmpid$/i];

/** Stable identity for an article link, ignoring tracking noise. */
export function hashUrl(url: string): string {
  let normalized = url.trim();
  try {
    normalized = normalizeUrl(url, {
      stripWWW: true,
      stripHash: true,
      removeTrailingSlash: true,
      sortQueryParameters: true,
      removeQueryParameters: TRACKING_PARAMS,
    });
  } catch {
    // keep the raw url
  }
  return createHash("sha1").update(normalized).digest("hex");
}

/**
 * Google News titles look like "Headline - Publisher". Strip the publisher
 * suffix when we know it (or when the feed is Google News and there is one).
 */
export function cleanTitle(raw: string, opts: { source?: string; fromGoogleNews?: boolean } = {}): string {
  let title = he.decode(raw).replace(/\s+/g, " ").trim();
  const idx = title.lastIndexOf(" - ");
  if (idx > 0) {
    const suffix = title.slice(idx + 3).trim();
    const matchesSource = opts.source && suffix.toLowerCase() === opts.source.toLowerCase();
    if (matchesSource || (opts.fromGoogleNews && suffix.length <= 40)) {
      title = title.slice(0, idx).trim();
    }
  }
  return title;
}

const MAX_SNIPPET = 200;

/** HTML description -> short plain-text blurb, or null when it is not real prose. */
export function cleanSnippet(html: string | undefined | null): string | null {
  if (!html) return null;
  // Google News descriptions are lists of related links, not prose.
  if (/<ol\b|news\.google\.com/i.test(html)) return null;
  const text = he
    .decode(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 20) return null;
  if (text.length <= MAX_SNIPPET) return text;
  const cut = text.slice(0, MAX_SNIPPET);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 120 ? lastSpace : MAX_SNIPPET).replace(/[,;:\-–—]$/, "")}…`;
}

const STOPWORDS = new Set(
  (
    "a an the and or but of to in on at for from by with as is are was were be been being it its this that these those " +
    "he she they them his her their we you your our i me my not no so than then there here what which who whom whose " +
    "when where why how all any both each few more most other some such only own same too very can will just should now " +
    "into over after before about against between through during above below up down out off again further once has have " +
    "had having do does did doing says said say new amid"
  ).split(" "),
);

/** Lowercased content words from a headline, for near-duplicate detection. */
export function tokenizeTitle(title: string): Set<string> {
  const tokens = title
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return new Set(tokens);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Pull a canonical publisher name out of a feed item or fall back to the feed label. */
export function sourceName(raw: unknown, fallback: string): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object" && "_" in raw && typeof (raw as { _: unknown })._ === "string") {
    return ((raw as { _: string })._ ?? "").trim() || fallback;
  }
  return fallback;
}
