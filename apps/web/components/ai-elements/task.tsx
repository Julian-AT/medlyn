"use client";

import { ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type TaskItemFileProps = ComponentProps<typeof Badge>;
export const TaskItemFile = ({ className, ...props }: TaskItemFileProps) => (
  <Badge
    variant="secondary"
    className={cn("gap-1 rounded-md text-xs font-normal", className)}
    {...props}
  />
);

export type TaskItemProps = ComponentProps<typeof CardDescription>;
export const TaskItem = ({ className, ...props }: TaskItemProps) => (
  <CardDescription className={cn("text-xs", className)} {...props} />
);

export type TaskProps = ComponentProps<typeof Collapsible>;
export const Task = ({ defaultOpen = true, ...props }: TaskProps) => (
  <Collapsible defaultOpen={defaultOpen} {...props} />
);

export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & { title: string };
export const TaskTrigger = ({ children, className, title, ...props }: TaskTriggerProps) => (
  <CollapsibleTrigger asChild {...props}>
    {children ?? (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "group h-auto w-full justify-start gap-2 px-0 py-1 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground",
          className,
        )}
      >
        <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} aria-hidden="true" />
        {title}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={2}
          className="ml-auto transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </Button>
    )}
  </CollapsibleTrigger>
);

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>;
export const TaskContent = ({ children, className, ...props }: TaskContentProps) => (
  <CollapsibleContent {...props}>
    <CardContent className={cn("my-2 ml-2 space-y-2 border-l border-border pl-4 pr-0", className)}>
      {children}
    </CardContent>
  </CollapsibleContent>
);
