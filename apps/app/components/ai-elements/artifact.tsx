"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ArtifactProps = ComponentProps<typeof Card>;
export const Artifact = ({ className, ...props }: ArtifactProps) => (
  <Card
    className={cn(
      "flex flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-none",
      className,
    )}
    {...props}
  />
);

export type ArtifactHeaderProps = ComponentProps<typeof CardHeader>;
export const ArtifactHeader = ({ className, ...props }: ArtifactHeaderProps) => (
  <CardHeader
    className={cn(
      "flex flex-row items-center justify-between border-b bg-muted/50 px-4 py-3",
      className,
    )}
    {...props}
  />
);

export type ArtifactCloseProps = ComponentProps<typeof Button>;
export const ArtifactClose = ({
  className,
  children,
  size = "icon-sm",
  variant = "ghost",
  ...props
}: ArtifactCloseProps) => (
  <Button
    className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
    size={size}
    type="button"
    variant={variant}
    {...props}
  >
    {children ?? <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />}
    <span className="sr-only">Close</span>
  </Button>
);

export type ArtifactTitleProps = ComponentProps<typeof CardTitle>;
export const ArtifactTitle = ({ className, ...props }: ArtifactTitleProps) => (
  <CardTitle className={cn("text-sm font-medium", className)} {...props} />
);

export type ArtifactDescriptionProps = ComponentProps<typeof CardDescription>;
export const ArtifactDescription = ({ className, ...props }: ArtifactDescriptionProps) => (
  <CardDescription className={cn("text-xs", className)} {...props} />
);

export type ArtifactActionsProps = ComponentProps<typeof CardContent>;
export const ArtifactActions = ({ className, ...props }: ArtifactActionsProps) => (
  <CardContent className={cn("flex shrink-0 items-center gap-1 p-0", className)} {...props} />
);

export type ArtifactActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
  icon?: IconSvgElement;
};
export const ArtifactAction = ({
  tooltip,
  label,
  icon,
  children,
  className,
  size = "icon-sm",
  variant = "ghost",
  ...props
}: ArtifactActionProps) => {
  const button = (
    <Button
      className={cn("text-muted-foreground hover:text-foreground", className)}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {icon ? <HugeiconsIcon icon={icon} size={16} strokeWidth={2} /> : children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );
  return tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );
};

export type ArtifactContentProps = ComponentProps<typeof CardContent>;
export const ArtifactContent = ({ className, ...props }: ArtifactContentProps) => (
  <CardContent className={cn("min-h-0 flex-1 overflow-auto p-4", className)} {...props} />
);
