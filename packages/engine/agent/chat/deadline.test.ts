import { describe, expect, it } from "vitest";
import { beforeDeadline } from "../../../../apps/app/app/api/chat/deadline.ts";

describe("chat deadlines", () => {
  it("returns completed work", async () => {
    await expect(beforeDeadline(async () => "checked", new AbortController().signal)).resolves.toBe(
      "checked",
    );
  });

  it("interrupts work that ignores cancellation", async () => {
    const controller = new AbortController();
    const result = beforeDeadline(() => new Promise<never>(() => undefined), controller.signal);
    controller.abort(new Error("deadline"));
    await expect(result).rejects.toThrow("deadline");
  });

  it("never starts work after its deadline", async () => {
    const controller = new AbortController();
    controller.abort(new Error("expired"));
    let started = false;
    await expect(
      beforeDeadline(async () => {
        started = true;
      }, controller.signal),
    ).rejects.toThrow("expired");
    expect(started).toBe(false);
  });

  it("preserves upstream failures", async () => {
    await expect(
      beforeDeadline(async () => {
        throw new Error("failure");
      }, new AbortController().signal),
    ).rejects.toThrow("failure");
  });
});
