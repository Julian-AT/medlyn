import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChatGreeting() {
  return (
    <CardHeader className="justify-items-center gap-3 px-0 text-center">
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
