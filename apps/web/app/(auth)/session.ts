import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "medlyn-demo-session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function authConfigured(): boolean {
  return Boolean(process.env.DEMO_PASSWORD && (process.env.DEMO_SESSION_SECRET?.length ?? 0) >= 32);
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected || candidate.length > 1024) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}

function signature(payload: string): Buffer {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!authConfigured() || !secret) throw new Error("Demo authentication is not configured");
  const key = createHmac("sha256", secret)
    .update(`medlyn-demo-v1:${process.env.DEMO_PASSWORD}`)
    .digest();
  return createHmac("sha256", key).update(payload).digest();
}

export function createSession(now = Math.floor(Date.now() / 1000)): string {
  const payload = `v1.${now}.${now + SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function validSession(
  token: string | undefined,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (!authConfigured() || !token || token.length > 256) return false;
  const match = /^(v1\.(\d+)\.(\d+)\.[a-f0-9]{32})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const issued = Number(match[2]);
  const expires = Number(match[3]);
  if (!Number.isSafeInteger(issued) || !Number.isSafeInteger(expires)) return false;
  if (issued > now || expires <= now || expires - issued !== SESSION_SECONDS) return false;
  const actual = Buffer.from(match[4], "base64url");
  const expected = signature(match[1]);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function loginDestination(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\r\n]/.test(value)) return "/";
  const base = new URL("https://demo.invalid");
  try {
    const destination = new URL(value, base);
    if (
      destination.origin !== base.origin ||
      destination.pathname.startsWith("//") ||
      /^\/login\/?$/.test(destination.pathname)
    )
      return "/";
    return `${destination.pathname}${destination.search}`;
  } catch {
    return "/";
  }
}
