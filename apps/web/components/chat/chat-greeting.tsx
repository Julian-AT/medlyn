import { AiChat02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChatGreeting() {
  return (
    <CardHeader className="justify-items-center gap-3 px-0 text-center">
      <CardDescription
        aria-hidden="true"
        className="mb-2 flex size-14 items-center justify-center rounded-full bg-radial from-primary/25 via-primary/10 to-background text-primary ring-1 ring-primary/10"
      >
        <HugeiconsIcon icon={AiChat02Icon} size={26} strokeWidth={1.75} />
      </CardDescription>
      <CardTitle
        className="text-2xl font-semibold tracking-tight sm:text-3xl"
        role="heading"
        aria-level={1}
      >
        What do you need for Anna?
      </CardTitle>
      <CardDescription className="max-w-md text-sm/relaxed">
        Explore Anna Musterfrau’s care, with her source documents close at hand.
      </CardDescription>
    </CardHeader>
  );
}
