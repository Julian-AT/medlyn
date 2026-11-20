import { describe, expect, it } from "vitest";
import {
  environmentProblems,
  maskedEnvironment,
  projectEnvironment,
} from "../../../scripts/vercel-env.mjs";

const source = {
  OPENAI_API_KEY: "local-secret",
  OPENAI_API_KEY_PROD: "production-secret",
  OPENAI_BASE_URL: "http://localhost:8317/v1",
  MODEL_FAST: "configured-fast-role",
  MODEL_REASONING: "configured-reasoning-role",
  DATABASE_URL: "postgresql://user:secret@db.eu-central-1.neon.tech/db",
  MEDLYN_DATA_PATH: "local-only",
  MEDLYN_VERIFIER: "local",
};

describe("Vercel environment plans", () => {
  it("maps the production key, OpenAI URL and frozen database", () => {
    const plan = projectEnvironment("app", { ...source, DATABASE_URL_DEMO: "frozen-database" });
    expect(plan.OPENAI_API_KEY).toBe("production-secret");
    expect(plan.OPENAI_BASE_URL).toBe("https://api.openai.com/v1");
    expect(plan.DATABASE_URL).toBe("frozen-database");
    expect(plan.MEDLYN_VERIFIER).toBe("gpt");
    expect(plan.MEDLYN_MOCK).toBe("0");
    expect(plan).not.toHaveProperty("MEDLYN_DATA_PATH");
  });
  it("never falls back to the local proxy key", () => {
    const plan = projectEnvironment("app", { ...source, OPENAI_API_KEY_PROD: "" });
    expect(plan.OPENAI_API_KEY).toBe("");
    expect(environmentProblems("app", plan)).toContain("OPENAI_API_KEY is missing");
  });
  it("supports production model roles without hard-coded model IDs", () => {
    const plan = projectEnvironment("app", { ...source, MODEL_FAST_PROD: "production-fast-role" });
    expect(plan.MODEL_FAST).toBe("production-fast-role");
    expect(environmentProblems("app", plan)).toEqual([]);
  });
  it("maps Gemini production to its OpenAI-compatible endpoint and key", () => {
    const plan = projectEnvironment("app", {
      ...source,
      LLM_PROVIDER_PROD: "gemini",
      GEMINI_API_KEY: "gemini-secret",
      MODEL_FAST_FALLBACK: "configured-fast-fallback",
    });
    expect(plan.OPENAI_BASE_URL).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
    expect(plan.OPENAI_API_KEY).toBe("gemini-secret");
    expect(plan.GEMINI_API_KEY).toBe("gemini-secret");
    expect(plan.MODEL_FAST_FALLBACK).toBe("configured-fast-fallback");
    expect(plan).not.toHaveProperty("MODEL_REASONING_FALLBACK");
    expect(environmentProblems("app", plan)).toEqual([]);
  });
  it("requires a Gemini key in Gemini production mode", () => {
    const plan = projectEnvironment("app", { ...source, LLM_PROVIDER_PROD: "gemini" });
    expect(environmentProblems("app", plan)).toContain("OPENAI_API_KEY is missing");
  });
  it("sends only public origins to the landing project", () => {
    expect(Object.keys(projectEnvironment("www", source)).sort()).toEqual([
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SITE_URL",
    ]);
  });
  it("masks every credential, including the database URL", () => {
    const output = maskedEnvironment(projectEnvironment("app", source)).join("\n");
    for (const value of [source.OPENAI_API_KEY_PROD, source.DATABASE_URL]) {
      expect(output).not.toContain(value);
    }
    expect(output).toContain("OPENAI_API_KEY=[masked]");
  });
  it("rejects local origins and incomplete voice configuration", () => {
    const plan = projectEnvironment("app", {
      ...source,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      FISH_AUDIO_API_KEY: "voice-secret",
    });
    expect(environmentProblems("app", plan)).toEqual([
      "NEXT_PUBLIC_APP_URL must use a production URL",
      "Set both FISH_AUDIO_API_KEY and FISH_AUDIO_VOICE_ID, or neither",
    ]);
  });
});
