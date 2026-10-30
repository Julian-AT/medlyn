import { smallTalkReply } from "@medlyn/engine/agent/intent";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

/** Fixed boilerplate has no patient claims and needs neither model nor evidence access. */
export function smallTalkResponse(question: string): Response | null {
  const greeting = smallTalkReply(question);
  if (!greeting) return null;
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const messageId = crypto.randomUUID();
      writer.write({ type: "start", messageId });
      writer.write({ type: "text-start", id: messageId });
      writer.write({ type: "text-delta", id: messageId, delta: greeting });
      writer.write({ type: "text-end", id: messageId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
}
