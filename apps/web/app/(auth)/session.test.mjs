import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "../../proxy.ts";
import {
  authConfigured,
  createSession,
  loginDestination,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_SECONDS,
  validSession,
} from "./session.ts";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DEMO_PASSWORD", "synthetic-demo-password");
  vi.stubEnv("DEMO_SESSION_SECRET", "synthetic-signing-secret-with-32-characters");
  vi.stubEnv("OPENAI_BASE_URL", "https://api.openai.com/v1");
  vi.stubEnv("MEDLYN_MOCK", "0");
  vi.stubEnv("MEDLYN_VERIFIER", "gpt");
});
afterEach(() => vi.unstubAllEnvs());

describe("demo authentication", () => {
  it("compares passwords including different lengths and Unicode", () => {
    expect(passwordMatches("synthetic-demo-password")).toBe(true);
    expect(passwordMatches("short")).toBe(false);
    expect(passwordMatches("ä".repeat(1025))).toBe(false);
    vi.stubEnv("DEMO_PASSWORD", "äöü");
    expect(passwordMatches("äöü")).toBe(true);
    expect(passwordMatches("aou")).toBe(false);
  });
  it("fails closed when authentication is incomplete", () => {
    vi.stubEnv("DEMO_SESSION_SECRET", "short");
    expect(authConfigured()).toBe(false);
    expect(validSession("anything")).toBe(false);
    expect(() => createSession()).toThrow("not configured");
  });
  it("expires after seven days and rejects future sessions", () => {
    const session = createSession(100);
    expect(validSession(session, 100)).toBe(true);
    expect(validSession(session, 100 + SESSION_SECONDS - 1)).toBe(true);
    expect(validSession(session, 100 + SESSION_SECONDS)).toBe(false);
    expect(validSession(session, 99)).toBe(false);
  });
  it("rejects tampering, malformed tokens, and changed credentials", () => {
    const session = createSession(100);
    expect(validSession(session.replace("v1.100.", "v1.101."), 102)).toBe(false);
    const boundary = session.lastIndexOf(".") + 1;
    const changed = session[boundary] === "a" ? "b" : "a";
    expect(
      validSession(`${session.slice(0, boundary)}${changed}${session.slice(boundary + 1)}`, 102),
    ).toBe(false);
    expect(validSession(`${session}.extra`, 102)).toBe(false);
    expect(validSession(undefined, 102)).toBe(false);
    vi.stubEnv("DEMO_PASSWORD", "changed-password");
    expect(validSession(session, 102)).toBe(false);
    vi.stubEnv("DEMO_PASSWORD", "synthetic-demo-password");
    vi.stubEnv("DEMO_SESSION_SECRET", "changed-signing-secret-with-32-characters");
    expect(validSession(session, 102)).toBe(false);
  });
  it.each([
    "https://outside.invalid",
    "//outside.invalid",
    "/\\outside.invalid",
    "/a/..//outside.invalid",
    "///[",
    "/login",
    "/login/",
    null,
  ])("rejects unsafe return destination %s", (value) => expect(loginDestination(value)).toBe("/"));
  it("preserves internal paths and query parameters", () => {
    expect(loginDestination("/patient?tab=evidence")).toBe("/patient?tab=evidence");
  });
});

describe("request gate", () => {
  const request = (pathname, token) =>
    new NextRequest(`https://demo.invalid${pathname}`, {
      headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
    });

  it.each(["/api/chat", "/api/lens", "/api/patient/list", "/api/document/example.json"])(
    "rejects unauthenticated API %s",
    (pathname) => expect(proxy(request(pathname)).status).toBe(401),
  );
  it("redirects pages and allows the login page", () => {
    const result = proxy(request("/patient?tab=evidence"));
    expect(result.status).toBe(303);
    expect(new URL(result.headers.get("location")).searchParams.get("next")).toBe(
      "/patient?tab=evidence",
    );
    expect(proxy(request("/login")).headers.get("x-middleware-next")).toBe("1");
  });
  it("allows a signed session and rejects a forged cookie", () => {
    expect(proxy(request("/api/lens", createSession())).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(request("/api/lens", "forged")).status).toBe(401);
  });
  it("returns 503 when access is unconfigured", () => {
    vi.stubEnv("DEMO_PASSWORD", "");
    expect(proxy(request("/api/lens")).status).toBe(503);
  });
  it("preserves the integrated local-development bypass", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_PASSWORD", "");
    expect(proxy(request("/api/lens")).headers.get("x-middleware-next")).toBe("1");
  });
  it("disables local research and local service configurations in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const token = createSession();
    expect(proxy(request("/api/research/cohort", token)).status).toBe(404);
    vi.stubEnv("MEDLYN_VERIFIER", "local");
    expect(proxy(request("/api/lens", token)).status).toBe(503);
    vi.stubEnv("MEDLYN_VERIFIER", "gpt");
    vi.stubEnv("OPENAI_BASE_URL", "http://localhost:8317/v1");
    expect(proxy(request("/api/lens", token)).status).toBe(503);
  });
});
