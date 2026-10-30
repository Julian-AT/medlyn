"use client";

import { isToolUIPart, type UIMessage } from "ai";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { renderToolPart } from "@/components/gen-ui/registry";
import { CardDescription } from "@/components/ui/card";
import { ChatSources } from "./chat-sources";
import { ChatToolSteps } from "./chat-tool-steps";
import { CitedResponse } from "./cited-response";
import { followUpSuggestions } from "./follow-up-suggestions";
import type { ValidatedSpeech } from "./hooks/use-speech-output";
import { InvestigationPlan } from "./investigation-plan";
import { MessageControls } from "./message-controls";
import { messageEvidence, UNSUPPORTED_ANSWER } from "./message-evidence";
import { SourceTool } from "./source-tool";

export function ChatMessage({
  message,
  autoOpenSources = false,
  busy = false,
  disabled = false,
  investigate = false,
  onRetry,
  onFollowUp,
  onSpeak,
  onStopSpeech,
  speaking = false,
}: {
  message: UIMessage;
  autoOpenSources?: boolean;
  busy?: boolean;
  disabled?: boolean;
  investigate?: boolean;
  onRetry?: () => void;
  onFollowUp?: (text: string) => void;
  onSpeak: (speech: ValidatedSpeech[]) => void;
  onStopSpeech: () => void;
  speaking?: boolean;
}) {
  const evidence = messageEvidence(message);
  const tools = message.parts.filter(isToolUIPart);
  const hasAnswer =
    evidence.claims.length > 0 || tools.some((part) => part.state === "output-available");
  return (
    <Message from={message.role} className="border-0">
      <MessageContent>
        {message.role === "user" ? (
          <MessageResponse>
            {message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n")}
          </MessageResponse>
        ) : (
          <>
            {investigate && <InvestigationPlan message={message} busy={busy} />}
            <ChatToolSteps message={message} factIds={evidence.factIds} busy={busy} />
            {tools.map((part) => {
              if (part.type === "dynamic-tool") return null;
              if (part.type === "tool-show_source" && "input" in part) {
                const input = part.input as { segmentId?: string } | undefined;
                return typeof input?.segmentId === "string" ? (
                  <SourceTool
                    key={part.toolCallId}
                    segmentId={input.segmentId}
                    autoOpen={autoOpenSources}
                  />
                ) : null;
              }
              return (
                <MessageContent key={part.toolCallId} className="gap-0">
                  {renderToolPart(part)}
                </MessageContent>
              );
            })}
            {evidence.text && (
              <CitedResponse
                text={evidence.text}
                claims={evidence.claims}
                sources={evidence.sources}
              />
            )}
            {evidence.unavailable && <CardDescription>{UNSUPPORTED_ANSWER}</CardDescription>}
            <ChatSources segmentIds={evidence.sources} checked={evidence.checked} />
            {!busy && (hasAnswer || evidence.unavailable || tools.length > 0) && (
              <MessageControls
                id={message.id}
                text={evidence.copyText}
                sources={evidence.sources}
                speech={evidence.speech}
                onSpeak={onSpeak}
                onStopSpeech={onStopSpeech}
                speaking={speaking}
                onRetry={onRetry}
                disabled={disabled}
              />
            )}
            {!busy && hasAnswer && onFollowUp && (
              <Suggestions wrap className="gap-2 pt-2" aria-label="Follow-up questions">
                {followUpSuggestions(message).map((suggestion) => (
                  <Suggestion
                    key={suggestion}
                    suggestion={suggestion}
                    onClick={onFollowUp}
                    disabled={disabled}
                    className="h-auto min-h-8 whitespace-normal border-border/60 bg-background px-3 py-1.5 text-left text-xs font-normal text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
                  />
                ))}
              </Suggestions>
            )}
          </>
        )}
      </MessageContent>
    </Message>
  );
}
