"use client";

import { useActivePatient } from "@/components/patient/active-patient-provider";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChatGreeting() {
  const { patient } = useActivePatient();
  return (
    <CardHeader className="justify-items-center gap-3 px-0 text-center">
      <CardTitle
        className="text-balance text-2xl/9 font-normal tracking-tight sm:text-[30px]/10"
        role="heading"
        aria-level={1}
      >
        What do you need for {patient.displayName.split(" ")[0]}?
      </CardTitle>
      <CardDescription className="max-w-md text-sm/6">
        Explore {patient.displayName}’s care, with every answer linked to its sources.
      </CardDescription>
    </CardHeader>
  );
}
