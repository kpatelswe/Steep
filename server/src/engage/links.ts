import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

/**
 * Short HMAC signatures for links that must work from an email without a
 * session: click tracking and more/less feedback. 16 hex chars is plenty for
 * "you can't forge feedback for someone else"; these are not bearer tokens.
 */
export function sign(...parts: string[]): string {
  return createHmac("sha256", config.JWT_SECRET).update(parts.join("\n")).digest("hex").slice(0, 16);
}

export function verify(sig: string | undefined, ...parts: string[]): boolean {
  if (!sig || sig.length !== 16) return false;
  const expected = sign(...parts);
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function trackedArticleUrl(userId: string, articleId: string): string {
  return `${config.APP_URL}/r/${articleId}?u=${userId}&s=${sign("r", userId, articleId)}`;
}

export type FeedbackDirection = "more" | "less";

export function feedbackUrl(userId: string, topicId: string, direction: FeedbackDirection): string {
  const s = sign("f", userId, topicId, direction);
  return `${config.APP_URL}/f?u=${userId}&t=${topicId}&d=${direction}&s=${s}`;
}

export function unsubscribeUrl(unsubscribeToken: string): string {
  return `${config.APP_URL}/unsubscribe/${unsubscribeToken}`;
}
