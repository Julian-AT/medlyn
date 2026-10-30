import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpeechSession } from "./use-speech-session.ts";

function harness({ throwOnStart = false } = {}) {
  const instances = [];
  class Recognition {
    lang = "";
    continuous = true;
    interimResults = false;
    onstart = null;
    onresult = null;
    onerror = null;
    onend = null;
    stopCount = 0;
    abortCount = 0;
    constructor() {
      instances.push(this);
    }
    start() {
      if (throwOnStart) throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
    }
    stop() {
      this.stopCount++;
    }
    abort() {
      this.abortCount++;
    }
    result(...texts) {
      this.onresult?.({
        results: texts.map((text) => ({ 0: { transcript: text }, isFinal: false })),
      });
    }
  }
  const states = [],
    interim = [],
    complete = [],
    errors = [];
  const session = createSpeechSession(Recognition, "de-AT", {
    state: (value) => states.push(value),
    interim: (value) => interim.push(value),
    complete: (value) => complete.push(value),
    error: (value) => errors.push(value),
  });
  return { session, instances, states, interim, complete, errors };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("browser recognition lifecycle", () => {
  it("streams interim results and completes exactly once on end", () => {
    const h = harness();
    h.session.start();
    const instance = h.instances[0];
    expect(instance.lang).toBe("de-AT");
    expect(instance.continuous).toBe(false);
    expect(instance.interimResults).toBe(true);
    instance.onstart();
    instance.result("check");
    instance.result("check medication", "please");
    expect(h.interim).toEqual(["check", "check medication please"]);
    expect(h.complete).toEqual([]);
    h.session.stop();
    const end = instance.onend;
    end();
    end();
    expect(h.complete).toEqual(["check medication please"]);
    expect(h.states.at(-1).phase).toBe("idle");
  });
  it("rejects queued events after cleanup and allows a new session", () => {
    const h = harness();
    h.session.start();
    const first = h.instances[0],
      lateResult = first.onresult;
    h.session.cancel();
    h.session.start();
    lateResult({ results: [{ 0: { transcript: "late result" }, isFinal: true }] });
    expect(first.abortCount).toBe(1);
    expect(first.onresult).toBeNull();
    expect(h.interim).toEqual([]);
    h.session.cancel();
  });
  it("recovers after permission denial without waiting for onend", () => {
    const h = harness();
    h.session.start();
    h.instances[0].onerror({ error: "not-allowed" });
    expect(h.errors).toEqual(["not-allowed"]);
    expect(h.states.at(-1).phase).toBe("idle");
    h.session.start();
    expect(h.instances).toHaveLength(2);
    h.session.cancel();
  });
  it("handles synchronous permission rejection", () => {
    const h = harness({ throwOnStart: true });
    h.session.start();
    expect(h.errors).toEqual(["not-allowed"]);
    expect(h.states.at(-1).phase).toBe("idle");
  });
  it("stops on silence and preserves interim text when end is omitted", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    const instance = h.instances[0];
    instance.onstart();
    instance.result("editable question");
    vi.advanceTimersByTime(2500);
    expect(instance.stopCount).toBe(1);
    vi.advanceTimersByTime(1500);
    expect(h.complete).toEqual(["editable question"]);
    expect(h.states.at(-1).phase).toBe("idle");
  });
  it("reports no speech once when recognition ends empty", () => {
    const h = harness();
    h.session.start();
    h.instances[0].onend();
    expect(h.errors).toEqual(["no-speech"]);
    expect(h.complete).toEqual([]);
  });
  it("cancels without submitting partial text or showing an error", () => {
    const h = harness();
    h.session.start();
    h.instances[0].result("partial");
    h.session.cancel();
    expect(h.complete).toEqual([]);
    expect(h.errors).toEqual([]);
  });
});
