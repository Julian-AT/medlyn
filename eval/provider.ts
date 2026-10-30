import type { ApiProvider, CallApiContextParams, ProviderResponse } from "promptfoo";
import type { LensRequest, Screen } from "@medlyn/engine/contracts";
import { mockLensStream } from "@medlyn/engine/lens/mock";
import { collectScreen, readJsonLines, visibleText } from "./screen.ts";

export type Capture = { screen: Screen; wallMs: number; mock: boolean; phase: "cold" | "warm" };
export type ProviderConfig = { noCache?: boolean; apiUrl?: string; mock?: boolean };

export default class MedlynProvider implements ApiProvider {
  config: ProviderConfig;
  private captures = new Map<string, Promise<Capture>>();

  constructor(options: { config?: ProviderConfig } = {}) {
    this.config = options.config ?? {};
  }

  id(): string { return "medlyn:screen"; }

  async capture(text: string, phase: "cold" | "warm" = "cold"): Promise<Capture> {
    const key = JSON.stringify([text, phase]);
    let pending = this.captures.get(key);
    if (!pending) {
      pending = (async () => {
        let result = await this.execute(text, phase);
        if (phase === "warm" && !result.mock && !result.screen.timings.cached &&
            result.screen.sections.every((section) => section.cards.every((card) => card.availability !== "unavailable"))) {
          result = await this.execute(text, phase);
        }
        return result;
      })();
      this.captures.set(key, pending);
    }
    return pending;
  }

  private async execute(text: string, phase: "cold" | "warm"): Promise<Capture> {
    const mock = this.config.mock ?? process.env.EVAL_MOCK === "1";
    const request: LensRequest = { text, noCache: phase === "cold" ? (this.config.noCache ?? true) : false };
    const started = performance.now();
    let events: AsyncIterable<unknown>;
    const apiUrl = this.config.apiUrl ?? process.env.MEDLYN_API_URL;
    if (mock) events = mockLensStream(1_000_000);
    else if (apiUrl) {
      const response = await fetch(apiUrl, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
        signal: AbortSignal.timeout(Number(process.env.EVAL_TIMEOUT_MS ?? 120_000)),
      });
      if (!response.ok || !response.body) throw new Error(`Lens API HTTP ${response.status}`);
      if (response.headers.get("X-Medlyn-Mode") === "mock") throw new Error("Live evaluation refused a mock API fallback; set EVAL_MOCK=1 for mock verification");
      events = readJsonLines(response.body);
    } else {
      const moduleUrl = new URL("../packages/engine/lens/stream.ts", import.meta.url).href;
      const engine = await import(moduleUrl) as { streamLens: (request: LensRequest) => AsyncIterable<unknown> };
      events = engine.streamLens(request);
    }
    const screen = await collectScreen(events);
    if (!mock && screen.window.corpusRevision === "mock") throw new Error("Live evaluation refused a mock screen");
    return { screen, wallMs: performance.now() - started, mock, phase };
  }

  async callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    try {
      const text = typeof context?.vars.situationText === "string" ? context.vars.situationText : prompt;
      const phase = context?.vars.phase === "warm" ? "warm" : "cold";
      const capture = await this.capture(text, phase);
      return { output: visibleText(capture.screen), metadata: capture, cached: false };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}
