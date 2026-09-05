import { describe, expect, it } from "vitest";
import { formatDuration, isDue, localDate, localHour, streakDays, timeAgo } from "../src/digest/time";

describe("local time", () => {
  const t = new Date("2026-09-08T11:30:00Z"); // 07:30 in Toronto (EDT), 13:30 in Berlin
  it("computes local date and hour per timezone", () => {
    expect(localHour(t, "America/Toronto")).toBe(7);
    expect(localHour(t, "Europe/Berlin")).toBe(13);
    expect(localDate(new Date("2026-09-08T03:30:00Z"), "America/Toronto")).toBe("2026-09-07");
  });
  it("is due exactly in the send hour and only once", () => {
    const u = { sendHour: 7, timezone: "America/Toronto" };
    expect(isDue(u, t, false)).toBe(true);
    expect(isDue(u, t, true)).toBe(false);
    expect(isDue({ ...u, sendHour: 8 }, t, false)).toBe(false);
    expect(isDue({ sendHour: 13, timezone: "Europe/Berlin" }, t, false)).toBe(true);
  });
});

describe("streakDays", () => {
  it("counts consecutive days ending today", () => {
    expect(streakDays(["2026-09-08", "2026-09-07", "2026-09-06", "2026-09-03"], "2026-09-08")).toBe(3);
  });
  it("is zero when today is missing", () => {
    expect(streakDays(["2026-09-07"], "2026-09-08")).toBe(0);
  });
});

describe("formatting", () => {
  it("formats durations and relative times", () => {
    expect(formatDuration(23.67 * 36e5)).toBe("23h 40m");
    expect(formatDuration(25 * 60_000)).toBe("25m");
    expect(formatDuration(3 * 864e5)).toBe("3d");
    const now = new Date("2026-09-08T12:00:00Z");
    expect(timeAgo(new Date("2026-09-08T11:15:00Z"), now)).toBe("45m ago");
    expect(timeAgo(new Date("2026-09-08T09:00:00Z"), now)).toBe("3h ago");
    expect(timeAgo(new Date("2026-09-06T09:00:00Z"), now)).toBe("2d ago");
  });
});
