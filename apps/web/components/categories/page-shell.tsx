import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <Card className="mx-auto min-w-0 w-full max-w-[1100px] gap-6 overflow-visible rounded-none bg-transparent px-4 py-6 shadow-none ring-0 md:px-8 md:py-8">
      <CardContent className="flex min-w-0 flex-col gap-6 px-0">{children}</CardContent>
    </Card>
  );
}
