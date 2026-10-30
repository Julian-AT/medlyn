"use client";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChatGreeting() {
  const { patient } = useActivePatient();
  return (
    <CardHeader className="justify-items-center gap-3 px-0 text-center">
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
