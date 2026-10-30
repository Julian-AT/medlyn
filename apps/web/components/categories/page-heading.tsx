import type { ReactNode } from "react";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="gap-5 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="gap-2 px-0">
        <CardTitle className="text-2xl font-semibold tracking-tight" role="heading" aria-level={1}>
          {title}
        </CardTitle>
        <CardDescription className="max-w-2xl leading-relaxed">{description}</CardDescription>
        {action && (
          <CardAction className="max-sm:col-start-1 max-sm:row-start-3 max-sm:justify-self-start">
            {action}
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}
