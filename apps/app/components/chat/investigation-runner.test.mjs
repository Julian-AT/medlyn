import { describe, expect, it } from "vitest";
import { runInvestigations } from "./investigation-runner.ts";

const questions = [
  { id: "a", title: "First check" },
  { id: "b", title: "Second check" },
];

describe("serial investigations", () => {
  it("awaits each answer before sending the next question exactly once", async () => {
    const calls = [];
    let release;
    const first = new Promise((resolve) => {
      release = resolve;
    });
    const running = runInvestigations(
      questions,
      async (text) => {
        calls.push(text);
        if (calls.length === 1) await first;
        return true;
      },
      () => true,
      () => {},
    );
    expect(calls).toEqual(["Investigate: First check"]);
    release();
    await running;
    expect(calls).toEqual(["Investigate: First check", "Investigate: Second check"]);
  });
  it("stops after a failed response without marking remaining work checked", async () => {
    const updates = [];
    await runInvestigations(
      questions,
      async () => false,
      () => true,
      (id, status) => updates.push([id, status]),
    );
    expect(updates).toEqual([
      ["a", "active"],
      ["a", "failed"],
    ]);
  });
  it("cancels between requests and ignores completion after cancellation", async () => {
    let active = true;
    const updates = [];
    await runInvestigations(
      questions,
      async () => {
        active = false;
        return true;
      },
      () => active,
      (id, status) => updates.push([id, status]),
    );
    expect(updates).toEqual([["a", "active"]]);
  });
});
