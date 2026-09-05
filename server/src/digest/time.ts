import { formatInTimeZone } from "date-fns-tz";

export function localDate(now: Date, tz: string): string {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

export function localHour(now: Date, tz: string): number {
  return Number(formatInTimeZone(now, tz, "H"));
}

/** "Tuesday, September 8" */
export function dateLabel(now: Date, tz: string): string {
  return formatInTimeZone(now, tz, "EEEE, MMMM d");
}

/** "7:00 AM Toronto time" */
export function sentAtLabel(now: Date, tz: string): string {
  const city = (tz.split("/").pop() ?? tz).replace(/_/g, " ");
  return `${formatInTimeZone(now, tz, "h:mm a")} ${city} time`;
}

export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

export function timeAgo(date: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** "23h 40m" */
export function formatDuration(ms: number): string {
  const totalMins = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (h >= 48) return `${Math.round(h / 24)}d`;
  return `${h}h ${m}m`;
}

/** Consecutive local dates ending at `today` (inclusive) that appear in `dates`. */
export function streakDays(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  let count = 0;
  let cursor = new Date(`${today}T00:00:00Z`);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor = new Date(cursor.getTime() - 864e5);
  }
  return count;
}

/** Should this user receive their scheduled issue on this tick? */
export function isDue(user: { sendHour: number; timezone: string }, now: Date, hasScheduledToday: boolean): boolean {
  if (hasScheduledToday) return false;
  return localHour(now, user.timezone) === user.sendHour;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Estimated read time: ~15 seconds per story. */
export function readMinutes(stories: number): number {
  return Math.max(1, Math.round((stories * 15) / 60));
}
