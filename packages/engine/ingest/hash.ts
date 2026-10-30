import { createHash } from "node:crypto";
import type { Fact } from "../contracts.ts";

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, stable(v)]),
    );
  }
  return value;
}

export function contentHash(
  f: Pick<
    Fact,
    | "segmentId"
    | "kind"
    | "labelEn"
    | "attrs"
    | "assertion"
    | "temporalStatus"
    | "eventDate"
    | "quote"
    | "start"
    | "end"
  >,
): string {
  const {
    segmentId,
    kind,
    labelEn,
    attrs,
    assertion,
    temporalStatus,
    eventDate,
    quote,
    start,
    end,
  } = f;
  return sha256(
    JSON.stringify(
      stable({
        segmentId,
        kind,
        labelEn,
        attrs,
        assertion,
        temporalStatus,
        eventDate,
        quote,
        start,
        end,
      }),
    ),
  );
}

export function factId(hash: string): string {
  return `f-${hash.slice(0, 16)}`;
}
