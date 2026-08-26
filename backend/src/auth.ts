import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export const SESSION_COOKIE = "poker_hub_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function appPassword(): string | undefined {
  const password = process.env.APP_PASSWORD;
  return password && password.length > 0 ? password : undefined;
}

function sessionToken(password: string): string {
  return createHmac("sha256", password).update("poker-hub.session.v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isPasswordValid(password: string): boolean {
  const expected = appPassword();
  if (!expected) return false;
  return safeEqual(password, expected);
}

export function isAuthConfigured(): boolean {
  return appPassword() !== undefined;
}

export function setSessionCookie(c: Context): void {
  const password = appPassword();
  if (!password) return;
  setCookie(c, SESSION_COOKIE, sessionToken(password), {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export function hasValidSession(c: Context): boolean {
  const password = appPassword();
  if (!password) return false;
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return false;
  return safeEqual(token, sessionToken(password));
}

function isPublicPath(path: string): boolean {
  return path.endsWith("/auth/login") || path.endsWith("/auth/logout");
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (isPublicPath(c.req.path)) {
    return next();
  }
  if (!isAuthConfigured()) {
    return c.json({ error: "Authentication is not configured" }, 503);
  }
  if (!hasValidSession(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
};
