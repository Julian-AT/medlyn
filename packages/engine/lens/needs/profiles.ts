import type { Profile, Situation } from "../../contracts.ts";

const section = (id: string, title: string, ...needIds: string[]) => ({ id, title, needIds });
export const CRITICAL_NEED_IDS = ["allergies", "antithrombotics"];
export const PROFILES: Profile[] = [
  {
    id: "anaesthesia_preop",
    role: "Anaesthetist",
    matches: [
      "anaesthesia",
      "anesthesia",
      "anaesthetist",
      "anesthesiologist",
      "anästhes",
      "pre-op",
      "preoperative",
      "pre-assessment",
    ],
    sections: [
      section("procedure", "Procedure and date", "procedure_date"),
      section("critical", "Critical", ...CRITICAL_NEED_IDS),
      section("cardiac", "Cardiac function", "cardiac_function", "ecg", "holter_rhythm"),
      section(
        "blood_pressure",
        "Blood pressure and medicines",
        "blood_pressure",
        "antihypertensives",
      ),
      section("airway", "Airway and aspiration", "airway_aspiration", "bmi"),
      section("diabetes", "Diabetes", "diabetes_drugs", "hba1c"),
      section("kidney", "Kidney function", "kidney_function"),
      section("carotid", "Carotid stenosis", "carotid_stenosis"),
      section("other", "Other conditions and laboratory results", "comorbidities", "labs"),
    ],
  },
  {
    id: "surgery_tumour_board",
    role: "Surgeon",
    matches: [
      "surgeon",
      "surgery",
      "surgical",
      "chirurg",
      "tumour board",
      "tumor board",
      "tumorboard",
    ],
    sections: [
      section("diagnosis", "Diagnosis and side", "diagnosis_side"),
      section("histology", "Histology, grade and TNM", "histology_tnm"),
      section("receptors", "Receptors and Ki-67", "receptors_ki67"),
      section("tumour", "Tumour size and location", "tumour_size_location"),
      section("nodes", "Axillary lymph nodes", "axillary_nodes"),
      section("imaging", "BI-RADS", "birads"),
      section("board", "Tumour board recommendation", "tumour_board"),
      section("risks", "Surgical risks", "surgical_risks"),
      section("family", "Family history", "family_history"),
    ],
  },
  {
    id: "gp_diabetes",
    role: "General practitioner",
    matches: [
      "general practitioner",
      "gp",
      "family doctor",
      "hausarzt",
      "hausärzt",
      "diabetes review",
      "diabetes follow-up",
    ],
    sections: [
      section("drugs", "Glucose-lowering medicines", "diabetes_drugs"),
      section("hba1c", "Latest HbA1c", "hba1c"),
      section("weight", "Weight and BMI", "weight_trend", "bmi"),
      section(
        "blood_pressure",
        "Blood pressure and medicines",
        "blood_pressure",
        "antihypertensives",
      ),
      section("lipid_therapy", "Lipid therapy", "lipid_therapy"),
      section("kidney", "Kidney function", "kidney_function"),
      section("eyes", "Eye findings and follow-up", "eye_findings"),
      section("cardiovascular", "Cardiovascular disease", "cardiovascular_disease"),
      section("screening", "Diabetes screening", "urine_albumin", "lipids", "foot_exam"),
    ],
  },
  {
    id: "emergency_dizziness",
    role: "Emergency physician",
    matches: ["emergency", "dizziness", "blurred vision", "notarzt", "notaufnahme", "schwindel"],
    sections: [
      section("episodes", "Prior similar episodes", "prior_episodes"),
      section("carotid", "Carotid stenosis and side", "carotid_stenosis"),
      section("antithrombotics", "Antithrombotics", "antithrombotics"),
      section("blood_pressure", "Antihypertensives", "antihypertensives"),
      section("contrast", "Before contrast", "contrast_risks"),
      section("rhythm", "Holter rhythm", "holter_rhythm"),
      section("diabetes", "Diabetes medicines", "diabetes_drugs"),
      section("cancer", "Cancer and planned surgery", "active_cancer_planned_surgery"),
      section("followups", "Open follow-ups", "open_followups"),
    ],
  },
  {
    id: "open_followups",
    role: "Discharge follow-up reviewer",
    matches: [
      "open follow-ups",
      "open followups",
      "discharge follow-up",
      "follow-ups from",
      "outstanding recommendations",
      "nachsorge",
      "offene kontrollen",
    ],
    sections: [
      section(
        "recommendations",
        "Discharge recommendations and completion",
        "discharge_recommendations",
      ),
      section("context", "Context for follow-up", "carotid_stenosis"),
      section("later", "Later follow-up evidence", "open_followups"),
    ],
  },
  {
    id: "medical_oncologist",
    role: "Medical oncologist",
    matches: ["medical oncologist", "medical oncology", "oncologist", "onkolog"],
    sections: [
      section(
        "cancer",
        "Cancer and treatment planning",
        "diagnosis_side",
        "histology_tnm",
        "receptors_ki67",
        "tumour_size_location",
        "axillary_nodes",
        "tumour_board",
        "menopausal_status",
      ),
      section(
        "safety",
        "Treatment context",
        "cardiac_function",
        "kidney_function",
        "labs",
        "immunosuppression",
        "bone_health",
        "current_medication_list",
      ),
    ],
  },
  {
    id: "radiation_oncologist",
    role: "Radiation oncologist",
    matches: [
      "radiation oncologist",
      "radiation oncology",
      "radiotherapy",
      "iort",
      "strahlentherap",
    ],
    sections: [
      section(
        "cancer",
        "Tumour and radiation planning",
        "diagnosis_side",
        "histology_tnm",
        "receptors_ki67",
        "tumour_size_location",
        "axillary_nodes",
        "tumour_board",
        "procedure_date",
      ),
      section("risks", "Treatment context", "comorbidities", "surgical_risks"),
    ],
  },
  {
    id: "radiologist_contrast",
    role: "Radiologist",
    matches: [
      "radiologist",
      "radiology",
      "contrast ct",
      "contrast scan",
      "kontrastmittel",
      "radiolog",
    ],
    sections: [
      section("contrast", "Contrast safety", "contrast_risks", "kidney_function", "diabetes_drugs"),
      section(
        "imaging",
        "Imaging context",
        "carotid_stenosis",
        "diagnosis_side",
        "tumour_size_location",
        "birads",
        "open_followups",
      ),
    ],
  },
  {
    id: "cardiologist",
    role: "Cardiologist",
    matches: ["cardiologist", "cardiology", "kardiolog"],
    sections: [
      section(
        "cardiac",
        "Cardiac assessment",
        "cardiac_function",
        "ecg",
        "holter_rhythm",
        "blood_pressure",
        "antihypertensives",
        "cardiovascular_disease",
      ),
      section(
        "vascular",
        "Vascular and metabolic context",
        "carotid_stenosis",
        "lipid_therapy",
        "kidney_function",
        "diabetes_drugs",
      ),
    ],
  },
  {
    id: "ophthalmologist",
    role: "Ophthalmologist",
    matches: ["ophthalmologist", "ophthalmology", "eye doctor", "augenarzt", "augenärzt"],
    sections: [
      section(
        "eyes",
        "Eye findings and symptoms",
        "eye_findings",
        "prior_episodes",
        "open_followups",
      ),
      section(
        "context",
        "Metabolic and vascular context",
        "diabetes_drugs",
        "hba1c",
        "blood_pressure",
        "carotid_stenosis",
      ),
    ],
  },
  {
    id: "ward_nurse",
    role: "Ward nurse",
    matches: ["ward nurse", "nurse", "nursing", "pflege", "krankenschwester"],
    sections: [
      section(
        "care",
        "Care planning",
        "procedure_date",
        "current_medication_list",
        "diabetes_drugs",
        "blood_pressure",
        "pain_mobility",
        "airway_aspiration",
      ),
      section(
        "followups",
        "Discharge and follow-up",
        "discharge_recommendations",
        "open_followups",
      ),
    ],
  },
  {
    id: "pharmacist",
    role: "Pharmacist",
    matches: ["pharmacist", "pharmacy", "medication review", "apotheker", "pharmaz"],
    sections: [
      section(
        "medicines",
        "Dated medication lists",
        "current_medication_list",
        "antihypertensives",
        "diabetes_drugs",
        "lipid_therapy",
        "bone_health",
        "immunosuppression",
      ),
      section("safety", "Medication context", "kidney_function", "labs", "contrast_risks"),
    ],
  },
  {
    id: "dietitian",
    role: "Dietitian",
    matches: [
      "dietitian",
      "dietician",
      "nutritionist",
      "dietetic",
      "diätolog",
      "ernährungsberatung",
    ],
    sections: [
      section("nutrition", "Nutrition and weight", "nutrition", "weight_trend", "bmi"),
      section(
        "metabolic",
        "Metabolic context",
        "hba1c",
        "diabetes_drugs",
        "lipids",
        "kidney_function",
        "bone_health",
      ),
    ],
  },
  {
    id: "psycho_oncology",
    role: "Psycho-oncology clinician",
    matches: [
      "psycho-oncology",
      "psycho oncology",
      "psychooncology",
      "psychoonkolog",
      "psychologist",
    ],
    sections: [
      section(
        "support",
        "Psychosocial context",
        "psychosocial_support",
        "family_history",
        "pain_mobility",
      ),
      section(
        "treatment",
        "Diagnosis and treatment plans",
        "diagnosis_side",
        "tumour_board",
        "active_cancer_planned_surgery",
        "open_followups",
      ),
    ],
  },
];

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
function matchLength(text: string, keyword: string): number {
  const escaped = fold(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stem =
    /(?:anasthes|onkolog|radiolog|kardiolog|augenarzt|hausarzt|strahlentherap|diatolog|psychoonkolog|pharmaz)$/.test(
      fold(keyword),
    );
  const ending = stem ? "(?:$|[^\\p{L}\\p{N}]|[\\p{L}]{1,8}\\b)" : "(?:$|[^\\p{L}\\p{N}])";
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}${ending}`, "u").test(fold(text))
    ? keyword.length
    : 0;
}

export function matchProfile(role: string, task: string): Profile | null {
  const followups = PROFILES.find((profile) => profile.id === "open_followups")!;
  const fromStay = /discharg|hospital|\bstay\b|inpatient|entlass|stationär/i.test(task);
  if (fromStay && followups.matches.some((word) => matchLength(task, word))) return followups;
  const ranked = PROFILES.map((profile) => ({
    profile,
    score:
      Math.max(0, ...profile.matches.map((word) => matchLength(role, word) * 10)) +
      Math.max(0, ...profile.matches.map((word) => matchLength(task, word))),
  })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].profile : null;
}

export const CHIPS: {
  id: string;
  label: string;
  text: string;
  profileId: string;
  situation: Situation;
}[] = [
  {
    id: "anaesthesia_preop",
    label: "Anaesthesia pre-op",
    role: "Anaesthetist",
    task: "Preoperative assessment before breast surgery",
    description: "Review documented findings before planned breast surgery.",
    procedure: "Quadrantectomy with IORT",
    procedureDate: "2016-05-16",
    concerns: ["anaesthetic risk"],
  },
  {
    id: "surgery_tumour_board",
    label: "Surgery after tumour board",
    role: "Surgeon",
    task: "Plan breast surgery after the tumour board",
    description: "Review the diagnosis, pathology and board recommendation.",
    procedure: "Quadrantectomy with IORT",
    procedureDate: "2016-05-16",
    concerns: ["tumour board", "surgical risks"],
  },
  {
    id: "gp_diabetes",
    label: "GP diabetes review",
    role: "General practitioner",
    task: "Diabetes review",
    description: "Review glucose-lowering treatment and metabolic follow-up.",
    concerns: ["diabetes", "weight trend"],
  },
  {
    id: "emergency_dizziness",
    label: "Emergency dizziness",
    role: "Emergency physician",
    task: "Assess dizziness and blurred vision",
    description: "Review earlier episodes, vascular findings and contrast risks.",
    concerns: ["dizziness", "blurred vision, left eye", "iodinated contrast"],
  },
  {
    id: "open_followups",
    label: "Open follow-ups",
    role: "Discharge follow-up reviewer",
    task: "Review open follow-ups from a hospital stay",
    description: "Check discharge recommendations against later documentation.",
    concerns: ["discharge recommendations", "completion evidence"],
  },
].map(({ id, label, role, task, description, concerns, ...procedure }) => ({
  id,
  label,
  text: `${label}. ${description}`,
  profileId: id,
  situation: { role, task, ...procedure, asOf: "2016-04-15", concerns, profileId: id, tier: 1 },
}));
