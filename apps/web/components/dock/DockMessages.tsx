"use client";

import { createContext, useContext } from "react";
import { MessagePrimitive, type TextMessagePartProps } from "@assistant-ui/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SourceChip } from "./SourceChip.tsx";

export const Citations = createContext<Record<string, string>>({});

function CitedText({ text }: TextMessagePartProps) {
  const citations = useContext(Citations);
  if (text === "[removed: not supported by the sources]") {
    return (
      <CardContent>
        <Alert>
          <AlertDescription>The answer could not be supported by the sources.</AlertDescription>
        </Alert>
      </CardContent>
    );
  }
  return (
    <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">
      {text.split(/(\[[^\]]+\])/g).map((part, index) => {
        if (!/^\[[^\]]+\]$/.test(part)) return part;
        return part
          .slice(1, -1)
          .split(/[,;\s]+/)
          .filter(Boolean)
          .map((id) =>
            citations[id] ? (
              <SourceChip key={`${index}-${id}`} segmentId={citations[id]} label="Source" />
            ) : null,
          );
      })}
    </CardContent>
  );
}

function UserText({ text }: TextMessagePartProps) {
  return <CardContent className="whitespace-pre-wrap text-sm">{text}</CardContent>;
}

export function AssistantMessage() {
  return (
    <MessagePrimitive.Root asChild>
      <Card size="sm" className="my-3">
        <CardHeader>
          <Badge variant="secondary">Medlyn</Badge>
        </CardHeader>
        <MessagePrimitive.Parts components={{ Text: CitedText }} />
        <MessagePrimitive.Error>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Couldn’t complete this investigation. Please try again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </MessagePrimitive.Error>
      </Card>
    </MessagePrimitive.Root>
  );
}

export function UserMessage() {
  return (
    <MessagePrimitive.Root asChild>
      <Card size="sm" className="my-3 ml-6">
        <CardHeader>
          <Badge variant="outline">You</Badge>
        </CardHeader>
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </Card>
    </MessagePrimitive.Root>
  );
}
