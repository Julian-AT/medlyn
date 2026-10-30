import { type UiToolContext, UiToolSchemas, uiTools } from "@medlyn/engine/agent/ui-tools";
import type { LensEvent } from "@medlyn/engine/contracts";
import { screenFromEvents } from "@medlyn/engine/lens/screen";
import { streamLens } from "@medlyn/engine/lens/stream";
import { tool } from "ai";
import { z } from "zod";

export function patientUiTools(ctx: UiToolContext) {
  return {
    ...uiTools(ctx),
    open_lens: tool({
      description: "Show a situation lens for the active patient, preserving the evidence window.",
      inputSchema: z.object({ text: z.string().min(1), chipId: z.string().nullable() }),
      outputSchema: UiToolSchemas.open_lens,
      execute: async ({ text, chipId }) => {
        const events: LensEvent[] = [];
        for await (const event of streamLens({
          text,
          chipId: chipId ?? undefined,
          patientId: ctx.patientId,
          asOf: ctx.window.asOf,
          sessionId: ctx.sessionId,
        })) {
          if (
            event.type === "situation" &&
            (event.patient.id !== ctx.patientId ||
              event.window.corpusRevision !== ctx.window.corpusRevision ||
              event.window.asOf !== ctx.window.asOf ||
              JSON.stringify([...event.window.eligibleDocumentIds].sort()) !==
                JSON.stringify([...ctx.window.eligibleDocumentIds].sort()))
          )
            throw new Error("Situation requested a different evidence window");
          if (event.type !== "headline") events.push(event);
        }
        return UiToolSchemas.open_lens.parse(screenFromEvents(events));
      },
    }),
  };
}
