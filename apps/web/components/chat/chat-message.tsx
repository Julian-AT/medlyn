"use client";

import { Claim } from "@medlyn/engine/contracts";
import { isToolUIPart, type UIMessage } from "ai";
import { Fragment } from "react";
import { z } from "zod";
import { InlineCitation, InlineCitationText } from "@/components/ai-elements/inline-citation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Tool, ToolHeader } from "@/components/ai-elements/tool";
import { SourceTool } from "@/components/chat/source-tool";
import { renderToolPart } from "@/components/gen-ui/registry";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";

const Validated = z.object({ claims: z.array(Claim), nextAction: z.string() });

function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

// Message-part rendering adapted from vercel/chatbot components/message.tsx (Apache-2.0).
export function ChatMessage({ message }: { message: UIMessage }) {
  const claims = message.parts.flatMap((part) => {
    if (part.type !== "data-validated") return [];
    const result = Validated.safeParse(part.data);
    return result.success ? result.data.claims : [];
  });
  const sources = [...new Set(claims.flatMap((claim) => claim.segmentIds))];
  return (
    <Message from={message.role}>
      <MessageContent className="w-full">
        {message.parts.map((part, index) => {
          const key = "toolCallId" in part ? part.toolCallId : `${message.id}-${index}`;
          if (part.type === "text") return <MessageResponse key={key}>{part.text}</MessageResponse>;
          if (part.type === "data-validated") return null;
          if (isToolUIPart(part)) {
            if (part.type === "dynamic-tool") return null;
            if (part.type === "tool-show_source" && "input" in part) {
              const input = part.input as { segmentId?: string } | undefined;
              return input?.segmentId ? <SourceTool key={key} segmentId={input.segmentId} /> : null;
            }
            return (
              <Fragment key={key}>
                {renderToolPart(part) ?? (
                  <Tool>
                    <ToolHeader type={part.type} state={part.state} />
                  </Tool>
                )}
              </Fragment>
            );
          }
          return null;
        })}
        {sources.length > 0 && (
          <Sources>
            <SourcesTrigger count={sources.length} />
            <SourcesContent>
              {sources.map((id, index) => (
                <InlineCitation key={id}>
                  <InlineCitationText>
                    <Button variant="link" size="sm" onClick={() => showSource(id)}>
                      Source {index + 1} · {id}
                    </Button>
                  </InlineCitationText>
                </InlineCitation>
              ))}
            </SourcesContent>
          </Sources>
        )}
        {claims.length > 0 && (
          <Card className="bg-transparent p-0 ring-0">
            <CardDescription>Checked against source documents</CardDescription>
          </Card>
        )}
      </MessageContent>
    </Message>
  );
}
