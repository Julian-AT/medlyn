import type { ReactNode } from "react";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryAccentKey } from "./category-accent";

export function PageHeading({
  title,
  description,
  action,
  category,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  category?: CategoryAccentKey;
}) {
  return (
    <Card
      data-category={category}
      className="gap-0 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0"
    >
      <CardHeader className="gap-y-2 px-0">
        <CardTitle className="text-2xl font-semibold" role="heading" aria-level={1}>
          {title}
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm/5">{description}</CardDescription>
        {action && (
          <CardAction className="self-center max-sm:col-start-1 max-sm:row-start-3 max-sm:mt-2 max-sm:justify-self-start">
            {action}
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}
