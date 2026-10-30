import { performance } from "node:perf_hooks";

export type LensTrace = <T>(stage: string, run: () => Promise<T>, scope?: string) => Promise<T>;

/** Emits timings only, without patient text or clinical evidence. */
export function lensTrace(started: number): LensTrace {
  return async (stage, run, scope) => {
    const before = performance.now();
    let ok = false;
    try {
      const value = await run();
      ok = true;
      return value;
    } finally {
      if (process.env.MEDLYN_PROFILE_LENS === "1") {
        const end = performance.now();
        console.info("lens_stage", {
          stage,
          scope,
          startMs: Math.round(before - started),
          endMs: Math.round(end - started),
          durationMs: Math.round(end - before),
          ok,
        });
      }
    }
  };
}
