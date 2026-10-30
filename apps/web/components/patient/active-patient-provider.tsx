"use client";

import type { Fact } from "@medlyn/engine/contracts";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PatientOption } from "@/lib/active-patient";
import { uniquePatients } from "./patient-options";

type ActivePatient = {
  patient: PatientOption;
  patients: PatientOption[];
  selectPatient: (id: string) => void;
  facts: Map<string, Fact>;
};
const PatientContext = createContext<ActivePatient | null>(null);

export function ActivePatientProvider({
  patient,
  patients,
  children,
}: {
  patient: PatientOption;
  patients: PatientOption[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [loadedPatients, setLoadedPatients] = useState<PatientOption[] | null>(null);
  const options = uniquePatients([...(loadedPatients ?? patients), patient]);
  const activePatient = options.find((entry) => entry.id === patient.id) ?? patient;
  const [facts, setFacts] = useState(new Map<string, Fact>());
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/patient/list", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Patient names unavailable");
        const body: { patients: PatientOption[] } = await response.json();
        if (!controller.signal.aborted) setLoadedPatients(uniquePatients(body.patients));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          console.warn(
            "patient_names_unavailable",
            error instanceof Error ? error.name : "Unknown",
          );
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/patient/facts?patientId=${patient.id}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Fact identities unavailable");
        const body: { facts: Fact[] } = await response.json();
        if (!controller.signal.aborted)
          setFacts(new Map(body.facts.map((fact) => [fact.id, fact])));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          console.warn(
            "fact_identities_unavailable",
            error instanceof Error ? error.name : "Unknown",
          );
      });
    return () => controller.abort();
  }, [patient.id]);
  async function selectPatient(id: string) {
    const next = options.find((entry) => entry.id === id);
    if (!next || id === patient.id) return;
    try {
      const response = await fetch("/api/patient/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: id }),
      });
      if (!response.ok) throw new Error("Patient selection unavailable");
      window.location.assign(pathname.startsWith("/chat/") ? "/" : pathname);
    } catch (error) {
      console.warn("patient_selection_failed", error instanceof Error ? error.name : "Unknown");
      toast.error("Couldn't switch patients. Try again.");
    }
  }
  return (
    <PatientContext.Provider
      value={{ patient: activePatient, patients: options, selectPatient, facts }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function useActivePatient() {
  const value = useContext(PatientContext);
  if (!value) throw new Error("Active patient provider is required");
  return value;
}
