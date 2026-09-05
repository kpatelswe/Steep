import Parser from "rss-parser";
import { cleanSnippet, cleanTitle, hashUrl, sourceName } from "./normalize.js";

export interface NormalizedItem {
  url: string;
  urlHash: string;
  title: string;
  source: string;
  snippet: string | null;
  imageUrl: string | null;
  publishedAt: Date;
}

type RawItem = Parser.Item & {
  source?: unknown;
  media?: { $?: { url?: string; medium?: string; type?: string } } | Array<{ $?: { url?: string } }>;
  thumb?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  "content:encoded"?: string;
};

const parser = new Parser<Record<string, never>, RawItem>({
  timeout: 10_000,
  customFields: {
    item: [
      ["media:content", "media", { keepArray: false }],
      ["media:thumbnail", "thumb", { keepArray: false }],
      ["source", "source"],
      ["content:encoded", "content:encoded"],
    ],
  },
});

export const MAX_AGE_HOURS = 36;
const USER_AGENT = "Steep/0.1 (+https://github.com/kishanpatel/steep; daily news digest)";

function pickImage(item: RawItem): string | null {
  const fromMedia = (m: RawItem["media"]) => {
    if (!m) return null;
    const first = Array.isArray(m) ? m[0] : m;
    const url = first?.$?.url;
    return url && /^https?:\/\//.test(url) ? url : null;
  };
  const media = fromMedia(item.media);
  if (media) return media;
  const thumb = fromMedia(item.thumb);
  if (thumb) return thumb;
  const enc = item.enclosure;
  if (enc?.url && (enc.type?.startsWith("image/") || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(enc.url))) return enc.url;
  const html = item["content:encoded"] ?? item.content ?? "";
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m?.[1] && /^https?:\/\//.test(m[1]) ? m[1] : null;
}

export function isGoogleNews(feedUrl: string): boolean {
  return /news\.google\.com\/rss/.test(feedUrl);
}

/** Pure: parsed feed XML -> normalized items (fresh ones only). */
export async function parseFeedXml(
  xml: string,
  opts: { feedUrl: string; feedLabel: string; now?: Date },
): Promise<NormalizedItem[]> {
  const now = opts.now ?? new Date();
  const fromGoogle = isGoogleNews(opts.feedUrl);
  const feed = await parser.parseString(xml);
  const out: NormalizedItem[] = [];
  for (const item of feed.items) {
    const link = item.link?.trim();
    const rawTitle = item.title?.trim();
    if (!link || !rawTitle) continue;
    const published = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;
    if (!published || Number.isNaN(published.getTime())) continue;
    const ageHours = (now.getTime() - published.getTime()) / 36e5;
    if (ageHours > MAX_AGE_HOURS || ageHours < -2) continue;

    const source = sourceName(item.source, opts.feedLabel);
    const title = cleanTitle(rawTitle, { source, fromGoogleNews: fromGoogle });
    if (title.length < 12) continue;
    out.push({
      url: link,
      urlHash: hashUrl(link),
      title,
      source,
      snippet: cleanSnippet(item["content:encoded"] ?? item.content ?? item.contentSnippet ?? item.summary),
      imageUrl: pickImage(item),
      publishedAt: published,
    });
  }
  return out;
}

export async function fetchFeedXml(url: string, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
