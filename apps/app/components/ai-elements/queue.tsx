"use client";

import { CheckmarkCircle02Icon, CircleIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Queue = ({ className, ...props }: ComponentProps<typeof Card>) => (
  <Card
    className={cn(
      "gap-3 rounded-2xl border border-border bg-background p-4 shadow-none ring-0",
      className,
    )}
    {...props}
  />
);

export const QueueList = ({ className, ...props }: ComponentProps<typeof CardContent>) => (
  <CardContent role="list" className={cn("space-y-3 px-0", className)} {...props} />
);

export const QueueItem = ({ className, ...props }: ComponentProps<typeof CardContent>) => (
  <CardContent
    role="listitem"
    className={cn("flex items-start gap-2 px-0", className)}
    {...props}
  />
);

export function QueueItemIndicator({
  completed,
  active,
}: {
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <HugeiconsIcon
      icon={completed ? CheckmarkCircle02Icon : active ? Loading03Icon : CircleIcon}
      size={15}
      strokeWidth={2}
      aria-hidden="true"
      className={cn(
        "mt-0.5 shrink-0 text-muted-foreground",
        active && "motion-safe:animate-spin text-foreground",
      )}
    />
  );
}

export const QueueItemContent = ({
  className,
  ...props
}: ComponentProps<typeof CardDescription>) => (
  <CardDescription
    className={cn("min-w-0 flex-1 text-xs/5 text-foreground", className)}
    {...props}
  />
);
