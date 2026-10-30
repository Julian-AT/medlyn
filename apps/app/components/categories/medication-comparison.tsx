import type { MedicationEntry, MedicationSourceList } from "./medication-data";
import {
  medicationDose,
  medicationIdentity,
  medicationRoute,
  medicationScheduleText,
  medicationStrength,
  medicationSummary,
} from "./medication-format";

export type MedicationChange = {
  id: string;
  label: string;
  before: MedicationEntry | null;
  after: MedicationEntry | null;
};

function comparable(entry: MedicationEntry): boolean {
  const { assertion, temporalStatus } = entry.evidence.line;
  return assertion === "present" && ["ongoing", "stated", "done"].includes(temporalStatus);
}

function comparisonKey(attrs: MedicationAttrs): string {
  // Count-unit wording and supplemental notes are not changes to the structured dose schedule.
  return JSON.stringify([
    medicationIdentity(attrs.brand ?? ""),
    medicationStrength(attrs),
    medicationRoute(attrs.route),
    attrs.schedule?.map(medicationDose),
    attrs.schedule ? null : attrs.scheduleText?.trim() || null,
  ]);
}

function changedLabel(before: MedicationEntry, after: MedicationEntry): string {
  const strength = medicationStrength(before.attrs) !== medicationStrength(after.attrs);
  const schedule =
    JSON.stringify(before.attrs.schedule?.map(medicationDose)) !==
      JSON.stringify(after.attrs.schedule?.map(medicationDose)) ||
    before.attrs.scheduleText !== after.attrs.scheduleText;
  if (strength && schedule) return "Strength & schedule changed";
  if (strength) return "Strength changed";
  if (schedule) return "Schedule changed";
  if (medicationRoute(before.attrs.route) !== medicationRoute(after.attrs.route))
    return "Route changed";
  return "List details changed";
}

export function medicationChangeValues(change: MedicationChange): [string, string] {
  const { before, after } = change;
  if (!before || !after) {
    return [
      before ? medicationSummary(before.attrs) : "Not in previous list",
      after ? medicationSummary(after.attrs) : "Not in selected list",
    ];
  }
  const fields = [
    [medicationStrength(before.attrs), medicationStrength(after.attrs)],
    [medicationScheduleText(before.attrs), medicationScheduleText(after.attrs)],
    [medicationRoute(before.attrs.route), medicationRoute(after.attrs.route)],
    [before.attrs.brand ?? "—", after.attrs.brand ?? "—"],
  ].filter(([left, right]) => left !== right);
  return [
    fields.map(([left]) => left || "See source").join(" · "),
    fields.map(([, right]) => right || "See source").join(" · "),
  ];
}

/** Compare list membership, without treating omission as clinical discontinuation. */
export function compareMedicationLists(
  previous: MedicationSourceList,
  selected: MedicationSourceList,
): MedicationChange[] {
  const before = previous.entries.filter(comparable);
  const after = selected.entries.filter(comparable);
  const names = new Set([...before, ...after].map((row) => medicationIdentity(row.attrs.generic)));
  return [...names].sort().flatMap<MedicationChange>((name) => {
    const oldRows = before.filter((row) => medicationIdentity(row.attrs.generic) === name);
    const newRows = after.filter((row) => medicationIdentity(row.attrs.generic) === name);
    const unmatchedBefore = oldRows.filter(
      (row) => !newRows.some((other) => comparisonKey(row.attrs) === comparisonKey(other.attrs)),
    );
    const unmatchedAfter = newRows.filter(
      (row) => !oldRows.some((other) => comparisonKey(row.attrs) === comparisonKey(other.attrs)),
    );
    if (unmatchedBefore.length === 1 && unmatchedAfter.length === 1) {
      return [
        {
          id: `${unmatchedBefore[0].id}:${unmatchedAfter[0].id}`,
          label: changedLabel(unmatchedBefore[0], unmatchedAfter[0]),
          before: unmatchedBefore[0],
          after: unmatchedAfter[0],
        },
      ];
    }
    return [
      ...unmatchedAfter.map((row) => ({
        id: `added:${row.id}`,
        label: "Newly listed",
        before: null,
        after: row,
      })),
      ...unmatchedBefore.map((row) => ({
        id: `unlisted:${row.id}`,
        label: "No longer listed",
        before: row,
        after: null,
      })),
    ];
  });
}

import type { MedicationAttrs } from "@medlyn/engine/contracts";
