import snapshot from "../../../data/research-snapshot.json";
import type { CohortReport } from "./cohort/cohort-report.ts";

export const cohortSnapshot = snapshot.cohort as CohortReport;
export const evaluationSnapshot = {
  ...snapshot.evaluation,
  quantum: snapshot.quantum,
  metrics: snapshot.metrics,
};
