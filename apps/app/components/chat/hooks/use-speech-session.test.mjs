import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpeechSession } from "./use-speech-session.ts";

function harness({ throwOnStart = false } = {}) {
  const instances = [];
  let starts = 0;
  class Recognition {
    lang = "";
    continuous = false;
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
      starts++;
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
        results: texts.map((text, index) => ({ 0: { transcript: text }, isFinal: index === 0 })),
      });
    }
  }
  const states = [],
    interim = [],
    complete = [],
    errors = [];
  const session = createSpeechSession(Recognition, "de-DE", {
    state: (value) => states.push(value),
    interim: (value) => interim.push(value),
    complete: (value) => complete.push(value),
    error: (value) => errors.push(value),
  });
  return { session, instances, states, interim, complete, errors, starts: () => starts };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("browser recognition lifecycle", () => {
  it("starts synchronously exactly once with continuous interim results", () => {
    const h = harness();
    h.session.start();
    h.session.start();
    expect(h.starts()).toBe(1);
    expect(h.instances[0]).toMatchObject({ lang: "de-DE", continuous: true, interimResults: true });
    h.session.cancel();
  });
  it("streams interim and final hypotheses and completes exactly once after explicit stop", () => {
    const h = harness();
    h.session.start();
    const instance = h.instances[0];
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
  it("restarts after a Safari-style end and preserves earlier text", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    const first = h.instances[0];
    first.onstart();
    first.result("first sentence");
    first.onend();
    expect(h.complete).toEqual([]);
    vi.advanceTimersByTime(150);
    const second = h.instances[1];
    second.onstart();
    second.result("next");
    second.result("next sentence");
    expect(h.interim.at(-1)).toBe("first sentence next sentence");
    h.session.stop();
    second.onend();
    expect(h.complete).toEqual(["first sentence next sentence"]);
    vi.runAllTimers();
    expect(h.starts()).toBe(2);
  });
  it.each(["stop", "cancel"])("cancels a queued restart on %s", (action) => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    h.instances[0].onstart();
    h.instances[0].result("question");
    h.instances[0].onend();
    h.session[action]();
    vi.runAllTimers();
    expect(h.starts()).toBe(1);
    expect(h.complete).toEqual(action === "stop" ? ["question"] : []);
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
  it.each(["not-allowed", "service-not-allowed", "audio-capture", "network", "no-speech"])(
    "surfaces %s once and never restarts after an error",
    (error) => {
      vi.useFakeTimers();
      const h = harness();
      h.session.start();
      const end = h.instances[0].onend;
      h.instances[0].onerror({ error });
      end();
      vi.runAllTimers();
      expect(h.errors).toEqual([error]);
      expect(h.states.at(-1).phase).toBe("idle");
      expect(h.starts()).toBe(1);
      h.session.start();
      expect(h.starts()).toBe(2);
      h.session.cancel();
    },
  );
  it("handles synchronous permission rejection", () => {
    const h = harness({ throwOnStart: true });
    h.session.start();
    expect(h.errors).toEqual(["not-allowed"]);
    expect(h.states.at(-1).phase).toBe("idle");
  });
  it("keeps dictation active through pauses after receiving text", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    const instance = h.instances[0];
    instance.onstart();
    instance.result("editable question");
    vi.advanceTimersByTime(30_000);
    expect(instance.stopCount).toBe(0);
    h.session.cancel();
  });
  it("preserves late final text and finishes when a stopped browser omits onend", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    const instance = h.instances[0];
    instance.onstart();
    instance.result("interim");
    h.session.stop();
    instance.result("final question");
    vi.advanceTimersByTime(1500);
    expect(h.complete).toEqual(["final question"]);
    expect(instance.abortCount).toBe(1);
    expect(h.states.at(-1).phase).toBe("idle");
  });
  it("stops a recognizer that starts after stop was requested during permission", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    const instance = h.instances[0];
    h.session.stop();
    instance.onstart();
    expect(instance.stopCount).toBe(2);
    expect(h.states.at(-1).phase).toBe("stopping");
    vi.advanceTimersByTime(1500);
    expect(h.errors).toEqual(["no-speech"]);
  });
  it("times out empty result events instead of leaving the microphone active", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    h.instances[0].onstart();
    h.instances[0].result("");
    vi.advanceTimersByTime(11_500);
    expect(h.errors).toEqual(["no-speech"]);
    expect(h.states.at(-1).phase).toBe("idle");
  });
  it("reports empty recognition once without a restart loop", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    h.instances[0].onstart();
    h.instances[0].onend();
    vi.runAllTimers();
    expect(h.errors).toEqual(["no-speech"]);
    expect(h.starts()).toBe(1);
  });
  it("cleans up on unmount without submitting partial text or showing an error", () => {
    vi.useFakeTimers();
    const h = harness();
    h.session.start();
    h.instances[0].onstart();
    h.instances[0].result("partial");
    h.session.cancel();
    vi.runAllTimers();
    expect(h.complete).toEqual([]);
    expect(h.errors).toEqual([]);
    expect(h.instances[0].onresult).toBeNull();
    expect(h.instances[0].abortCount).toBe(1);
  });
});
