import { describe, expect, it } from "vitest";
import { loadReviews } from "../review/load.ts";

const signal = () => new AbortController().signal;

describe("review reads", () => {
  it("uses an explicit patient, bypasses caches and accepts an empty ledger", async () => {
    const transport: typeof fetch = async (input, options) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("patientId")).toBe("patient-a");
      expect(url.searchParams.get("sessionId")).toBe("s&existing");
      expect(options?.cache).toBe("no-store");
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      return Response.json([]);
    };
    expect(await loadReviews("s&existing", "patient-a", signal(), transport)).toEqual([]);
  });

  it.each([408, 429, 500, 503])("retries transient HTTP %i once with backoff", async (status) => {
    let calls = 0;
    const started = performance.now();
    const transport: typeof fetch = async () =>
      ++calls === 1 ? new Response(null, { status }) : Response.json([]);
    expect(await loadReviews("s", "patient-a", signal(), transport)).toEqual([]);
    expect(calls).toBe(2);
    expect(performance.now() - started).toBeGreaterThanOrEqual(240);
  });

  it("retries network failures and exposes only the second failure", async () => {
    let calls = 0;
    const transport: typeof fetch = async () => {
      calls++;
      throw new TypeError("Network unavailable");
    };
    await expect(loadReviews("s", "patient-a", signal(), transport)).rejects.toThrow(
      "Network unavailable",
    );
    expect(calls).toBe(2);
  });

  it("recovers from a transient timeout", async () => {
    let calls = 0;
    const transport: typeof fetch = async () => {
      if (++calls === 1) throw new DOMException("Timed out", "TimeoutError");
      return Response.json([]);
    };
    await expect(loadReviews("s", "patient-a", signal(), transport)).resolves.toEqual([]);
    expect(calls).toBe(2);
  });

  it.each([400, 401, 403, 404, 409])("does not retry permanent HTTP %i", async (status) => {
    let calls = 0;
    const transport: typeof fetch = async () => {
      calls++;
      return new Response(null, { status });
    };
    await expect(loadReviews("s", "patient-a", signal(), transport)).rejects.toThrow(
      String(status),
    );
    expect(calls).toBe(1);
  });

  it.each([{}, [{ id: "invalid" }]])("rejects a malformed successful payload", async (body) => {
    let calls = 0;
    const transport: typeof fetch = async () => {
      calls++;
      return Response.json(body);
    };
    await expect(loadReviews("s", "patient-a", signal(), transport)).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("rejects another session's entries", async () => {
    const transport: typeof fetch = async () =>
      Response.json([
        {
          id: "r",
          sessionId: "another",
          targetType: "card",
          targetId: "c",
          targetHash: "h",
          action: "accept",
          author: "Clinician",
          supportResult: null,
          createdAt: "2026-10-30",
        },
      ]);
    await expect(loadReviews("s", "patient-a", signal(), transport)).rejects.toThrow(
      "another session",
    );
  });

  it("makes no request before the patient/session are ready or after cancellation", async () => {
    let calls = 0;
    const transport: typeof fetch = async () => {
      calls++;
      return Response.json([]);
    };
    await expect(loadReviews(" ", "patient-a", signal(), transport)).rejects.toThrow("not ready");
    await expect(loadReviews("s", "", signal(), transport)).rejects.toThrow("not ready");
    await expect(loadReviews("s", "patient-a", AbortSignal.abort(), transport)).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it("cancels the backoff when switching patients", async () => {
    const controller = new AbortController();
    let calls = 0;
    const transport: typeof fetch = async () => {
      calls++;
      setTimeout(() => controller.abort(), 25);
      return new Response(null, { status: 503 });
    };
    await expect(loadReviews("s", "patient-a", controller.signal, transport)).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
