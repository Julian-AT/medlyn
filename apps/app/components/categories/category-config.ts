import type { FactKind } from "@medlyn/engine/contracts";
export type CategoryConfig = { title: string; description: string; kinds: FactKind[] };
export const categories: Record<string, CategoryConfig> = {
  diagnoses: {
    title: "Diagnoses & history",
    description: "Diagnoses, symptoms and background, with the source and timing kept together.",
    kinds: ["diagnosis", "symptom", "family_history", "social_history"],
  },
  labs: {
    title: "Labs & vitals",
    description: "Source-dated measurements and laboratory results across the record.",
    kinds: ["lab", "measurement"],
  },
  imaging: {
    title: "Imaging & findings",
    description: "Imaging observations and adjudicated findings with their original passages.",
    kinds: ["imaging"],
  },
  oncology: {
    title: "Oncology",
    description: "Histology, staging, receptors and treatment recommendations in the record.",
    kinds: [
      "histology",
      "staging",
      "receptor",
      "diagnosis",
      "imaging",
      "procedure",
      "recommendation",
    ],
  },
  procedures: {
    title: "Procedures",
    description: "Documented procedures, with planned and completed care distinguished.",
    kinds: ["procedure"],
  },
  allergies: {
    title: "Allergies",
    description: "Source-supported allergy statements and their documented assertion.",
    kinds: ["allergy"],
  },
  medications: {
    title: "Medications",
    description:
      "Medication lists retain their source and date. Differences between lists are changes over time.",
    kinds: ["medication"],
  },
};
