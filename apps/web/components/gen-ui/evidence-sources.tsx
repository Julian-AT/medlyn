"use client";

import type { ComponentProps } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { SourceChips as SharedSourceChips } from "@/components/sources/source-chips";
import { sourceLabel } from "./source-label";

export function SourceChips({ sources }: ComponentProps<typeof SharedSourceChips>) {
  const { documents } = useActivePatient();
  return <SharedSourceChips sources={sources.map((source) => sourceLabel(source, documents))} />;
}
