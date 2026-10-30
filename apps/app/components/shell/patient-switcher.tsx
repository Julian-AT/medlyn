"use client";

import { formatDate } from "@medlyn/engine/dates";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { CASE_PATIENT_ID, patientAge, patientSexLabel } from "@/components/patient/patient-options";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { PatientOption } from "@/lib/active-patient";

function details(patient: PatientOption) {
  const age = patientAge(patient.birthDate, patient.asOf);
  return [
    patientSexLabel(patient.sex),
    age === null ? null : `${age} y`,
    patient.asOf ? `as of ${formatDate(patient.asOf)}` : "As-of date unavailable",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function PatientSwitcher({ onSelect }: { onSelect: () => void }) {
  const { patient, patients, selectPatient } = useActivePatient();
  const groups = [
    { label: "Case patient", entries: patients.filter((p) => p.id === CASE_PATIENT_ID) },
    { label: "Synthetic cohort", entries: patients.filter((p) => p.id !== CASE_PATIENT_ID) },
  ];
  return (
    <Command>
      <CommandInput placeholder="Search patients…" aria-label="Search patients" />
      <CommandList>
        <CommandEmpty>No patients found.</CommandEmpty>
        {groups
          .filter((group) => group.entries.length > 0)
          .map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.entries.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={entry.id}
                  keywords={[entry.displayName, group.label]}
                  data-checked={entry.id === patient.id}
                  className="flex-col items-start gap-0.5 pr-8 [&>svg]:absolute [&>svg]:right-2 [&>span]:text-xs [&>span]:font-normal [&>span]:text-muted-foreground"
                  onSelect={() => {
                    selectPatient(entry.id);
                    onSelect();
                  }}
                >
                  {entry.displayName}
                  <span>{details(entry)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
      </CommandList>
    </Command>
  );
}
