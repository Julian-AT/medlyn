import { LensRequest, type LensEvent } from "@medlyn/engine/contracts";
import { corpusDocument } from "@/lib/evidence-server";
import { mockLensStream } from "@medlyn/engine/lens/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter a situation to continue." }, { status: 400 });
  }
  const parsed = LensRequest.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Enter a situation and a valid as-of date." }, { status: 400 });
  const chipId =
    typeof body === "object" && body !== null && "chipId" in body && typeof body.chipId === "string"
      ? body.chipId
      : undefined;
  const encoder = new TextEncoder();
  let cancelled = false;
  let iterator: AsyncIterator<LensEvent> | undefined;
  let mock = process.env.MEDLYN_MOCK === "1";
  let stream: AsyncIterable<LensEvent>;
  try {
    if (mock) stream = demoStream();
    else
      stream = (await import("@medlyn/engine/lens/stream")).streamLens({
        ...parsed.data,
        chipId,
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
          while (!cancelled && iterator) {
            const next = await iterator.next();
            if (next.done) break;
            send(next.value);
          }
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
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
        "X-Medlyn-Mode": mock ? "mock" : "live",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.warn(
      "Lens engine unavailable; replaying labelled mock",
      error instanceof Error ? error.message : "Unknown error",
    );
    mock = true;
    const fallback = demoStream();
    return new Response(
      new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (request.signal.aborted) {
            await fallback.return(undefined);
            controller.close();
            return;
          }
          const next = await fallback.next();
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(`${JSON.stringify(next.value)}\n`));
        },
        async cancel() {
          await fallback.return(undefined);
        },
      }),
      {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
          "X-Medlyn-Mode": "mock",
          "X-Accel-Buffering": "no",
        },
      },
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
