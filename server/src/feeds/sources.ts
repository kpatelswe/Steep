/**
 * Where stories come from.
 *
 * Every topic gets a Google News feed (free, keyless, always fresh) plus a few
 * hand-picked publisher feeds that carry better snippets and images.
 * Custom topics ("Follow anything") get a single Google News search feed.
 */

const GN = "hl=en-US&gl=US&ceid=US:en";

export function googleNewsTopicFeed(topic: string): string {
  return `https://news.google.com/rss/headlines/section/topic/${topic}?${GN}`;
}

/** Search feed for a free-text query, limited to the last day so it stays fresh. */
export function googleNewsSearchFeed(query: string): string {
  const q = encodeURIComponent(`${query.trim()} when:1d`);
  return `https://news.google.com/rss/search?q=${q}&${GN}`;
}

export interface CuratedFeed {
  url: string;
  label: string;
}

export interface CuratedTopic {
  slug: string;
  name: string;
  accent: string;
  feeds: CuratedFeed[];
}

export const CURATED_TOPICS: CuratedTopic[] = [
  {
    slug: "world",
    name: "World",
    accent: "#B42318",
    feeds: [
      { url: googleNewsTopicFeed("WORLD"), label: "Google News" },
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", label: "BBC World" },
      { url: "https://feeds.npr.org/1004/rss.xml", label: "NPR World" },
      { url: "https://www.aljazeera.com/xml/rss/all.xml", label: "Al Jazeera" },
    ],
  },
  {
    slug: "us",
    name: "US",
    accent: "#1D4ED8",
    feeds: [
      { url: googleNewsTopicFeed("NATION"), label: "Google News" },
      { url: "https://feeds.npr.org/1001/rss.xml", label: "NPR News" },
      { url: "https://www.cbsnews.com/latest/rss/main", label: "CBS News" },
    ],
  },
  {
    slug: "business",
    name: "Business",
    accent: "#B45309",
    feeds: [
      { url: googleNewsTopicFeed("BUSINESS"), label: "Google News" },
      { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", label: "CNBC" },
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", label: "BBC Business" },
      { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", label: "MarketWatch" },
    ],
  },
  {
    slug: "technology",
    name: "Technology",
    accent: "#2563EB",
    feeds: [
      { url: googleNewsTopicFeed("TECHNOLOGY"), label: "Google News" },
      { url: "https://www.theverge.com/rss/index.xml", label: "The Verge" },
      { url: "https://feeds.arstechnica.com/arstechnica/index", label: "Ars Technica" },
      { url: "https://techcrunch.com/feed/", label: "TechCrunch" },
    ],
  },
  {
    slug: "science",
    name: "Science",
    accent: "#6D28D9",
    feeds: [
      { url: googleNewsTopicFeed("SCIENCE"), label: "Google News" },
      { url: "https://www.sciencedaily.com/rss/all.xml", label: "ScienceDaily" },
      { url: "https://api.quantamagazine.org/feed/", label: "Quanta" },
      { url: "https://www.nasa.gov/news-release/feed/", label: "NASA" },
    ],
  },
  {
    slug: "health",
    name: "Health",
    accent: "#DB2777",
    feeds: [
      { url: googleNewsTopicFeed("HEALTH"), label: "Google News" },
      { url: "https://feeds.npr.org/1128/rss.xml", label: "NPR Health" },
      { url: "https://feeds.bbci.co.uk/news/health/rss.xml", label: "BBC Health" },
      { url: "https://www.statnews.com/feed/", label: "STAT" },
    ],
  },
  {
    slug: "sports",
    name: "Sports",
    accent: "#15803D",
    feeds: [
      { url: googleNewsTopicFeed("SPORTS"), label: "Google News" },
      { url: "https://www.espn.com/espn/rss/news", label: "ESPN" },
      { url: "https://feeds.bbci.co.uk/sport/rss.xml", label: "BBC Sport" },
      { url: "https://sports.yahoo.com/rss/", label: "Yahoo Sports" },
    ],
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    accent: "#C026D3",
    feeds: [
      { url: googleNewsTopicFeed("ENTERTAINMENT"), label: "Google News" },
      { url: "https://variety.com/feed/", label: "Variety" },
      { url: "https://www.hollywoodreporter.com/feed/", label: "The Hollywood Reporter" },
      { url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", label: "BBC Culture" },
    ],
  },
];

export const CUSTOM_TOPIC_ACCENT = "#0F766E";
