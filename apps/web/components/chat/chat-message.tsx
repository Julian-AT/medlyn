"use client";

import { Claim } from "@medlyn/engine/contracts";
import { isToolUIPart, type UIMessage } from "ai";
import { Fragment } from "react";
import { z } from "zod";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolHeader } from "@/components/ai-elements/tool";
import { ChatSources } from "@/components/chat/chat-sources";
import { CitedResponse } from "@/components/chat/cited-response";
import { SourceTool } from "@/components/chat/source-tool";
import { renderToolPart } from "@/components/gen-ui/registry";

const Validated = z.object({ claims: z.array(Claim), nextAction: z.string() });

// Message-part rendering adapted from vercel/chatbot components/message.tsx (Apache-2.0).
export function ChatMessage({
  message,
  autoOpenSources = false,
}: {
  message: UIMessage;
  autoOpenSources?: boolean;
}) {
  const claims = message.parts.flatMap((part) => {
    if (part.type !== "data-validated") return [];
    const result = Validated.safeParse(part.data);
    return result.success ? result.data.claims : [];
  });
  const sources = [...new Set(claims.flatMap((claim) => claim.segmentIds))];
  const checked =
    claims.length > 0 &&
    claims.every(
      (claim) => claim.validation.support === "supported" || claim.validation.support === "exempt",
    );
  return (
    <Message from={message.role} className="border-0">
      <MessageContent>
        {message.parts.map((part, index) => {
          const key = "toolCallId" in part ? part.toolCallId : `${message.id}-${index}`;
          if (part.type === "text")
            return message.role === "assistant" && claims.length ? (
              <CitedResponse key={key} text={part.text} claims={claims} sources={sources} />
            ) : (
              <MessageResponse key={key}>{part.text}</MessageResponse>
            );
          if (part.type === "data-validated") return null;
          if (isToolUIPart(part)) {
            if (part.type === "dynamic-tool") return null;
            if (part.type === "tool-show_source" && "input" in part) {
              const input = part.input as { segmentId?: string } | undefined;
              return input?.segmentId ? (
                <SourceTool key={key} segmentId={input.segmentId} autoOpen={autoOpenSources} />
              ) : null;
            }
            return (
              <Fragment key={key}>
                {renderToolPart(part) ?? (
                  <Tool className="border-0 bg-transparent shadow-none">
                    <ToolHeader type={part.type} state={part.state} />
                  </Tool>
                )}
              </Fragment>
            );
          }
          return null;
        })}
        <ChatSources segmentIds={sources} checked={checked} />
      </MessageContent>
    </Message>
  );
}
