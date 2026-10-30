"use client";

import { CheckmarkCircle02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import type { UIMessage } from "ai";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { progressSummary, toolSteps } from "./tool-progress";

export function ChatToolSteps({
  message,
  factIds,
  busy,
}: {
  message: UIMessage;
  factIds: string[];
  busy: boolean;
}) {
  const steps = toolSteps(message.parts);
  if (!steps.length) return null;
  const active = busy ? steps.findLast((step) => step.status === "active") : undefined;
  return (
    <ChainOfThought className="w-full max-w-none space-y-2">
      <ChainOfThoughtHeader className="w-fit max-w-full text-xs">
        {active ? (
          <Shimmer as="span">{active.label}</Shimmer>
        ) : (
          progressSummary(message.parts, factIds)
        )}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="space-y-3 pb-2">
        {steps.map((step) => (
          <ChainOfThoughtStep
            key={step.id}
            icon={step.status === "active" ? Search01Icon : CheckmarkCircle02Icon}
            label={
              step.status === "active" && busy ? (
                <Shimmer as="span">{step.label}</Shimmer>
              ) : (
                step.label
              )
            }
            status={step.status === "active" && !busy ? "pending" : step.status}
            description={
              step.status === "active" && !busy ? "Stopped before this check finished" : undefined
            }
            className={step.failed ? "text-destructive" : undefined}
          />
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
