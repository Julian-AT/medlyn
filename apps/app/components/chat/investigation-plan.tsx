"use client";

import { CheckmarkCircle02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import type { UIMessage } from "ai";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { toolSteps } from "./tool-progress";

const TASKS = [
  {
    title: "Search facts",
    tools: [
      "search_facts",
      "open_lens",
      "timeline",
      "show_medications",
      "show_lab_trend",
      "show_timeline",
      "show_patient_summary",
    ],
  },
  { title: "Check documentation", tools: ["check_documented"] },
  {
    title: "Compare sources",
    tools: ["get_passage", "list_findings", "show_findings", "show_passage", "calculate"],
  },
];

export function InvestigationPlan({ message, busy }: { message: UIMessage; busy: boolean }) {
  const steps = toolSteps(message.parts);
  return (
    <ChainOfThought className="w-full max-w-none space-y-2">
      <ChainOfThoughtHeader className="w-fit max-w-full text-xs">
        {busy ? "Investigating open question…" : "Open question checks"}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="space-y-3 pb-2">
        {TASKS.map((task) => {
          const calls = steps.filter((step) => task.tools.includes(step.name));
          const active = calls.some((step) => step.status === "active");
          const failed = calls.some((step) => step.failed);
          const status = !calls.length
            ? "Not run"
            : failed
              ? "Couldn't check"
              : active
                ? busy
                  ? "Checking…"
                  : "Stopped"
                : "Done";
          return (
            <ChainOfThoughtStep
              key={task.title}
              icon={active ? Search01Icon : CheckmarkCircle02Icon}
              label={`${task.title} · ${status}`}
              status={active && busy ? "active" : calls.length ? "complete" : "pending"}
              className={failed ? "text-destructive" : undefined}
            />
          );
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
