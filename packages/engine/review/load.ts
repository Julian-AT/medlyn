import { ReviewEntry } from "../contracts.ts";
import { reviewScope } from "./session.ts";

class ReviewLoadError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Review load returned ${status}`);
    this.status = status;
  }
}

function transient(error: unknown): boolean {
  if (error instanceof ReviewLoadError)
    return [408, 425, 429].includes(error.status) || error.status >= 500;
  return error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError");
}

function backoff(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 250);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Retry reads once; writes must never be replayed into the append-only ledger. */
export async function loadReviews(
  sessionId: string,
  patientId: string,
  signal: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<ReviewEntry[]> {
  if (!reviewScope(sessionId, patientId)) throw new Error("The review session is not ready.");
  const query = new URLSearchParams({ sessionId, patientId });
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await transport(`/api/review?${query}`, {
        cache: "no-store",
        signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
      });
      if (!response.ok) throw new ReviewLoadError(response.status);
      const entries = ReviewEntry.array().parse(await response.json());
      if (entries.some((entry) => entry.sessionId !== sessionId))
        throw new Error("Review response belongs to another session.");
      return entries;
    } catch (error) {
      if (signal.aborted || attempt > 0 || !transient(error)) throw error;
      await backoff(signal);
    }
  }
}
