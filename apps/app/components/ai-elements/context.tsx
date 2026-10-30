"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Clinical context reports the evidence window rather than model token consumption.
export const Context = (props: ComponentProps<typeof Popover>) => <Popover {...props} />;

export const ContextTrigger = ({ className, ...props }: ComponentProps<typeof Button>) => (
  <PopoverTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-7 gap-1.5 rounded-full px-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  </PopoverTrigger>
);

export const ContextContent = ({ className, ...props }: ComponentProps<typeof PopoverContent>) => (
  <PopoverContent
    align="start"
    className={cn("w-72 gap-3 rounded-2xl border border-border shadow-sm", className)}
    {...props}
  />
);
