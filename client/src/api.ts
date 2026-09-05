export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data;
}

export interface TopicSummary {
  id: string;
  slug: string;
  name: string;
  accent: string;
  latest: { title: string; source: string } | null;
  followed: boolean;
}

export interface FollowedTopic {
  id: string;
  slug: string;
  name: string;
  accent: string;
  kind: "curated" | "custom";
  weight: number;
}

export interface Me {
  user: { email: string; timezone: string; sendHour: number; active: boolean };
  topics: FollowedTopic[];
  lastDigest: { id: string; sentAt: string; status: string; articleCount: number } | null;
}

export interface Stats {
  issuesReceived: number;
  storiesOpened: number;
  topTopics: { id: string; name: string; accent: string; n: number }[];
  streakDays: number;
  dailyOpens: { day: string; n: number }[];
}

export const api = {
  requestLink: (email: string) => call<{ ok: true; devLink?: string }>("POST", "/api/auth/request", { email }),
  logout: () => call<{ ok: true }>("POST", "/api/auth/logout"),
  me: () => call<Me>("GET", "/api/me"),
  patchMe: (patch: Partial<Me["user"]>) => call<{ user: Me["user"] }>("PATCH", "/api/me", patch),
  stats: () => call<Stats>("GET", "/api/me/stats"),
  topics: () => call<{ topics: TopicSummary[] }>("GET", "/api/topics"),
  follow: (topicIds: string[]) => call<{ ok: true }>("PUT", "/api/me/topics", { topicIds }),
  setWeight: (topicId: string, weight: number) => call<{ ok: true; weight: number }>("PATCH", `/api/me/topics/${topicId}`, { weight }),
  addCustom: (name: string) => call<{ topic: FollowedTopic & { articleCount: number } }>("POST", "/api/topics/custom", { name }),
  sendNow: () => call<{ outcome: { status: string; articleCount?: number; dryRun?: boolean } }>("POST", "/api/digest/send-now"),
};

export const MAX_TOPICS = 10;

/** Every IANA zone the browser knows, with the browser's own zone first. */
export function timezoneOptions(): string[] {
  const zones = (() => {
    try {
      return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      return [];
    }
  })();
  const mine = browserTimezone();
  return zones.includes(mine) ? zones : [mine, ...zones];
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";
  } catch {
    return "America/Toronto";
  }
}
