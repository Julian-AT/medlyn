"use client";

import type { UIMessage } from "ai";
import {
  Plan,
  PlanContent,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ai-elements/task";
import { CardContent, CardDescription } from "@/components/ui/card";
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
    <Plan
      defaultOpen
      className="gap-0 rounded-2xl border-border/60 bg-muted/30 py-0 shadow-none ring-0"
    >
      <PlanHeader className="flex-row items-center px-4 py-3">
        <PlanTitle className="text-xs font-medium">Investigate open question</PlanTitle>
        <PlanTrigger className="size-6" />
      </PlanHeader>
      <PlanContent className="space-y-2 px-4 pb-4">
        {TASKS.map((task) => {
          const calls = steps.filter((step) => task.tools.includes(step.name));
          const active = calls.some((step) => step.status === "active");
          const status = !calls.length
            ? "Not run"
            : calls.some((step) => step.failed)
              ? "Couldn't check"
              : active
                ? busy
                  ? "Checking…"
                  : "Stopped"
                : "Done";
          return (
            <Task key={task.title} defaultOpen={false}>
              <TaskTrigger title={`${task.title} · ${status}`} />
              <TaskContent>
                {calls.length ? (
                  calls.map((step) => <TaskItem key={step.id}>{step.label}</TaskItem>)
                ) : (
                  <CardDescription className="text-xs">This check has not run.</CardDescription>
                )}
              </TaskContent>
            </Task>
          );
        })}
        {!busy && (
          <CardContent className="px-0 pt-1">
            <CardDescription className="text-[11px]">
              Only completed checks contribute to the answer.
            </CardDescription>
          </CardContent>
        )}
      </PlanContent>
    </Plan>
  );
}
