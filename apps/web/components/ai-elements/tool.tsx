"use client";

import {
  CircleCheckIcon as CheckCircleIcon,
  ArrowDown01Icon as ChevronDownIcon,
  CircleIcon,
  Clock01Icon as ClockIcon,
  Wrench01Icon as WrenchIcon,
  CircleXIcon as XCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Card
    className={cn(
      "mb-1 w-full gap-0 rounded-2xl border border-border bg-card py-0 shadow-none ring-0",
      className,
    )}
  >
    <Collapsible className="group/tool" {...props} />
  </Card>
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels: Record<ToolUIPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Responded",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  };

  const icons: Record<ToolUIPart["state"], ReactNode> = {
    "input-streaming": <HugeiconsIcon icon={CircleIcon} className="size-4" />,
    "input-available": <HugeiconsIcon icon={ClockIcon} className="size-4 animate-pulse" />,
    "approval-requested": (
      <HugeiconsIcon icon={ClockIcon} className="size-4 text-muted-foreground" />
    ),
    "approval-responded": <HugeiconsIcon icon={CheckCircleIcon} className="size-4 text-primary" />,
    "output-available": <HugeiconsIcon icon={CheckCircleIcon} className="size-4 text-primary" />,
    "output-error": <HugeiconsIcon icon={XCircleIcon} className="size-4 text-destructive" />,
    "output-denied": <HugeiconsIcon icon={XCircleIcon} className="size-4 text-muted-foreground" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({ className, title, type, state, ...props }: ToolHeaderProps) => (
  <CollapsibleTrigger asChild {...props}>
    <Button
      variant="ghost"
      className={cn("h-auto w-full justify-between gap-3 rounded-2xl px-4 py-3", className)}
    >
      <HugeiconsIcon
        icon={WrenchIcon}
        size={18}
        strokeWidth={1.75}
        className="text-foreground/80"
        aria-hidden="true"
      />
      <CardTitle className="min-w-0 flex-1 truncate text-left text-sm font-medium">
        {title ?? type.split("-").slice(1).join(" ").replaceAll("_", " ")}
      </CardTitle>
      {getStatusBadge(state)}
      <HugeiconsIcon
        icon={ChevronDownIcon}
        size={16}
        strokeWidth={1.75}
        className="text-muted-foreground transition-transform group-data-[state=open]/tool:rotate-180"
        aria-hidden="true"
      />
    </Button>
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-foreground",
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
