import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { config, isProd } from "../config";
import { db } from "../db/client";
import { users, type User } from "../db/schema";

export const SESSION_COOKIE = "steep_session";
const SESSION_DAYS = 30;
const secret = new TextEncoder().encode(config.JWT_SECRET);

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: SESSION_DAYS * 864e5,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/** Loads req.user from the session cookie when present. Never blocks. */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = (req.cookies as Record<string, string | undefined>)[SESSION_COOKIE];
  if (token) {
    const userId = await verifySession(token);
    if (userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user) req.user = user;
    }
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  next();
}
