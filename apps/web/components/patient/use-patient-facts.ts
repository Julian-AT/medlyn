"use client";

import { useActivePatient } from "./active-patient-provider";

export function usePatientFacts() {
  return useActivePatient().facts;
}
