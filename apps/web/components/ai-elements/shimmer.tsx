"use client";

import { type ElementType, memo } from "react";
import { CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
};

export const Shimmer = memo(function Shimmer({
  children,
  as: Component = CardDescription,
  className,
}: TextShimmerProps) {
  return (
    <Component
      className={cn(
        "bg-linear-to-r from-muted-foreground via-primary to-muted-foreground bg-clip-text text-transparent motion-safe:animate-pulse",
        className,
      )}
    >
      {children}
    </Component>
  );
});
