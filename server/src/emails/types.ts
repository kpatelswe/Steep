export interface EmailStory {
  id: string;
  title: string;
  /** Tracked link (goes through /r/:id). */
  url: string;
  source: string;
  timeAgo: string;
  snippet: string | null;
  imageUrl: string | null;
  /** Number of distinct publishers covering this story. */
  clusterSize: number;
}

export interface EmailTopic {
  id: string;
  name: string;
  accent: string;
  stories: EmailStory[];
  moreUrl: string;
  lessUrl: string;
}

export interface EmailSuggestion {
  name: string;
  url: string;
}

export interface DigestData {
  /** e.g. "Tuesday, September 8" */
  dateLabel: string;
  /** e.g. "Good morning." */
  greeting: string;
  /** Time since the previous issue, e.g. "23h 40m"; null for the first issue. */
  steepedFor: string | null;
  /** Consecutive days with an issue, including today. */
  streakDays: number;
  totalStories: number;
  readMinutes: number;
  topics: EmailTopic[];
  /** Followed topics that had nothing new today. */
  quietTopics: string[];
  suggestions: EmailSuggestion[];
  links: {
    manage: string;
    viewInBrowser: string;
    unsubscribe: string;
  };
  /** e.g. "7:00 AM Toronto time" */
  sentAtLabel: string;
}

export interface MagicLinkData {
  url: string;
  /** Minutes until the link expires. */
  expiresInMinutes: number;
  isNewUser: boolean;
}
