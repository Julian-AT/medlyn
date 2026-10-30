import type { LensEvent } from "@medlyn/engine/contracts";
import { mockLensStream } from "@medlyn/engine/lens/mock";
import { PATIENT_ID } from "@medlyn/engine/store";
import { corpusDocument } from "@/lib/evidence-server";
import { patientIdFromRequest } from "../../../lib/active-patient.ts";
import { parseLensRequest } from "./request";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter a situation to continue." }, { status: 400 });
  }
  const parsed = parseLensRequest(body);
  if (!parsed.success)
    return Response.json(
      { error: "Choose a situation or enter your role and task." },
      { status: 400 },
    );
  const patientId = patientIdFromRequest(request);
  const encoder = new TextEncoder();
  let cancelled = false;
  let iterator: AsyncIterator<LensEvent> | undefined;
  const mock = process.env.MEDLYN_MOCK === "1";
  let stream: AsyncIterable<LensEvent>;
  try {
    if (mock && patientId !== PATIENT_ID)
      return Response.json(
        { error: "Live evidence is required for this patient." },
        { status: 503 },
      );
    if (mock) stream = demoStream();
    else
      stream = (await import("@medlyn/engine/lens/stream")).streamLens({
        ...parsed.data,
        patientId,
      });
    iterator = stream[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done || first.value.type === "error")
      throw new Error("Engine unavailable before first section");
    const firstEvent = first.value;
    const response = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: LensEvent) => {
          if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        send(firstEvent);
        try {
          let terminal = false;
          while (!cancelled && iterator) {
            const next = await iterator.next();
            if (next.done) break;
            send(next.value);
            if (next.value.type === "done" || next.value.type === "error") {
              terminal = true;
              break;
            }
          }
          if (!cancelled && !terminal)
            send({
              type: "error",
              message: "The lens was interrupted. Retry to check all sections.",
              retryable: true,
            });
        } catch (error) {
          console.error(
            "Lens stream interrupted",
            error instanceof Error ? error.message : "Unknown error",
          );
          send({
            type: "error",
            message: "The lens was interrupted. Retry to check all sections.",
            retryable: true,
          });
        } finally {
          await iterator?.return?.();
          if (!cancelled) controller.close();
        }
      },
      async cancel() {
        cancelled = true;
        await iterator?.return?.();
      },
    });
    return new Response(response, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "Content-Encoding": "identity",
        "X-Medlyn-Mode": mock ? "mock" : "live",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    await iterator?.return?.();
    console.warn("lens_unavailable", error instanceof Error ? error.name : "Unknown error");
    return Response.json(
      { error: "The evidence check is unavailable. Retry your situation." },
      { status: 503 },
    );
  }
}

async function* demoStream(): AsyncGenerator<LensEvent> {
  for await (const event of mockLensStream()) {
    if (event.type !== "situation" || event.patient.birthDateSegmentId) {
      yield event;
      continue;
    }
    try {
      const documents = await Promise.all(event.window.eligibleDocumentIds.map(corpusDocument));
      const segments = documents.flatMap((document) => document?.segments ?? []);
      const source = segments.find((segment) =>
        segment.text.includes(event.patient.birthDateQuote),
      );
      yield {
        ...event,
        patient: { ...event.patient, birthDateSegmentId: source?.id ?? null },
      };
    } catch (error) {
      console.warn(
        "Demo birth-date source unavailable",
        error instanceof Error ? error.message : "Unknown error",
      );
      yield event;
    }
  }
}
