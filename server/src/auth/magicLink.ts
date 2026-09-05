import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { magicLinks, users, type User } from "../db/schema";

export const MAGIC_LINK_MINUTES = 15;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Upserts the user and issues a single-use token. The raw token is only ever in the email. */
export async function createMagicLink(rawEmail: string, now = new Date()): Promise<{ token: string; isNewUser: boolean; user: User }> {
  const email = normalizeEmail(rawEmail);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let user = existing[0];
  const isNewUser = !user;
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, unsubscribeToken: randomBytes(24).toString("base64url") })
      .returning();
  }
  const token = randomBytes(32).toString("base64url");
  await db.insert(magicLinks).values({
    userId: user!.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + MAGIC_LINK_MINUTES * 60_000),
  });
  return { token, isNewUser, user: user! };
}

/** Marks the token used and returns its user, or null if it is unknown, used or expired. */
export async function consumeMagicLink(token: string, now = new Date()): Promise<User | null> {
  const tokenHash = hashToken(token);
  const [link] = await db
    .update(magicLinks)
    .set({ usedAt: now })
    .where(and(eq(magicLinks.tokenHash, tokenHash), isNull(magicLinks.usedAt), gt(magicLinks.expiresAt, now)))
    .returning({ userId: magicLinks.userId });
  if (!link) return null;
  const [user] = await db.select().from(users).where(eq(users.id, link.userId)).limit(1);
  return user ?? null;
}
