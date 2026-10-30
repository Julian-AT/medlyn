"use client";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChatGreeting() {
  const { patient } = useActivePatient();
  return (
    <CardHeader className="justify-items-center gap-3 px-0 text-center">
      <CardContent
        aria-hidden="true"
        className="mb-3 size-16 rounded-full bg-[image:var(--gradient-1)] p-0 shadow-lg shadow-foreground/5 ring-8 ring-muted/30"
      />
      <CardTitle
        className="text-2xl font-semibold tracking-tight sm:text-3xl"
        role="heading"
        aria-level={1}
      >
        What do you need for {patient.displayName.split(" ")[0]}?
      </CardTitle>
      <CardDescription className="max-w-md text-sm/relaxed">
        Explore {patient.displayName}’s care, with source documents close at hand.
      </CardDescription>
    </CardHeader>
  );
}
