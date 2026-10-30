import type {
  Card,
  Claim,
  ClaimLine,
  EvidenceWindow,
  Finding,
  LensEvent,
  Patient,
  Section,
  Situation,
} from "../contracts.ts";

const supported = { key: "mock", support: "supported" } as const;

function line(
  id: string,
  text: string,
  documentId: string,
  temporalStatus: ClaimLine["temporalStatus"] = "stated",
  assertion: ClaimLine["assertion"] = "present",
): ClaimLine {
  return {
    id: `claim-${id}`,
    kind: "template",
    text,
    factIds: [`fact-${id}`],
    segmentIds: [`seg-${documentId}-${id}`],
    author: "machine",
    validation: supported,
    assertion,
    temporalStatus,
  };
}

function card(fields: Partial<Card> & Pick<Card, "id" | "needId" | "title" | "why">): Card {
  return {
    cardType: "facts",
    critical: false,
    availability: "documented",
    completeness: "complete",
    conflict: "none",
    findingIds: [],
    lines: [],
    ...fields,
  };
}

const patient: Patient = {
  id: "patient-0000-0001",
  displayName: "Anna Musterfrau",
  sex: "F",
  birthDate: "1959-03-15",
  birthDateQuote: "geb. 15.03.1959",
  birthDateSegmentId: null,
};

const situation: Situation = {
  role: "Anaesthetist",
  task: "Pre-operative anaesthesia check",
  procedure: "Quadrantectomy with intraoperative radiotherapy (IORT)",
  procedureDate: "2016-05-16",
  asOf: "2016-04-15",
  concerns: [],
  profileId: "anaesthesia_preop",
  tier: 1,
};

const window: EvidenceWindow = {
  asOf: "2016-04-15",
  eligibleDocumentIds: [
    "12340008",
    "12340009",
    "12340010",
    "12340011",
    "12340012",
    "12340014",
    "12340016",
    "12340018",
  ],
  corpusRevision: "mock",
};

const sections: Section[] = [
  {
    id: "procedure",
    title: "Procedure",
    cards: [
      card({
        id: "card-procedure",
        needId: "procedure_date",
        title: "Procedure and date",
        why: "Sets the anaesthetic plan and the timing of drug pauses",
        lines: [
          line(
            "procedure",
            "Quadrantectomy with IORT, left breast · 16 May 2016 · Discharge letter, 15 Apr 2016",
            "12340018",
            "planned",
          ),
        ],
      }),
    ],
  },
  {
    id: "critical",
    title: "Critical",
    cards: [
      card({
        id: "card-allergies",
        needId: "allergies",
        title: "Allergies",
        why: "Avoid triggering a known reaction during anaesthesia",
        critical: true,
        lines: [
          line("allergy-contrast", "Contrast media · nausea, dizziness, vomiting", "12340018"),
        ],
      }),
      card({
        id: "card-antithrombotics",
        needId: "antithrombotics",
        title: "Antithrombotics",
        why: "Bleeding risk and whether to pause before surgery",
        critical: true,
        cardType: "medication_list",
        lines: [
          line(
            "asa",
            "Acetylsalicylic acid (Thrombo ASS) 100 mg, 1-0-0 · Discharge medication, 15 Apr 2016",
            "12340018",
            "ongoing",
          ),
        ],
      }),
    ],
  },
  {
    id: "cardiac",
    title: "Cardiac function",
    cards: [
      card({
        id: "card-ef",
        needId: "cardiac_function",
        title: "Ejection fraction",
        why: "Cardiac reserve for induction and fluid management",
        lines: [
          line("ef", "LVEF 60%, normal systolic function · Echocardiography, Jun 2015", "12340012", "done"),
        ],
      }),
      card({
        id: "card-holter",
        needId: "holter_rhythm",
        title: "Holter rhythm",
        why: "Arrhythmia risk under anaesthesia",
        lines: [
          line(
            "holter-af",
            "No atrial fibrillation · Holter ECG, 12 Jun 2015",
            "12340009",
            "done",
            "negated",
          ),
        ],
      }),
    ],
  },
  {
    id: "blood_pressure",
    title: "Blood pressure",
    cards: [
      card({
        id: "card-candesartan",
        needId: "antihypertensives",
        title: "Antihypertensives",
        why: "Haemodynamic stability; ARBs are often held on the day of surgery",
        cardType: "trend",
        lines: [
          line("candesartan-2015", "Candesartan (Blopress) 16 mg, 1-0-½ · Jun 2015", "12340012", "stated"),
          line(
            "candesartan-2016",
            "Candesartan (Blopress) 16 mg, 1-0-1 · Discharge medication, 15 Apr 2016",
            "12340018",
            "ongoing",
          ),
        ],
      }),
    ],
  },
  {
    id: "diabetes",
    title: "Diabetes",
    cards: [
      card({
        id: "card-diabetes-drugs",
        needId: "diabetes_drugs",
        title: "Glucose-lowering drugs",
        why: "Perioperative glucose control; GLP-1 agonists delay gastric emptying",
        cardType: "medication_list",
        lines: [
          line("metformin", "Metformin (Glucophage) 1000 mg, 1-1-1 · Discharge medication, 15 Apr 2016", "12340018", "ongoing"),
          line("pioglitazone", "Pioglitazone (Actos) 30 mg, 0-1-0 · Discharge medication, 15 Apr 2016", "12340018", "ongoing"),
          line("exenatide", "Exenatide (Byetta) 5 µg s.c., 1-0-1 · Discharge medication, 15 Apr 2016", "12340018", "ongoing"),
        ],
      }),
      card({
        id: "card-hba1c",
        needId: "hba1c",
        title: "HbA1c",
        why: "Glycaemic control before elective surgery",
        lines: [line("hba1c", "HbA1c 6.4% · Jun 2015", "12340012", "done")],
      }),
    ],
  },
  {
    id: "kidney",
    title: "Kidney function",
    cards: [
      card({
        id: "card-kidney",
        needId: "kidney_function",
        title: "Kidney function",
        why: "Drug dosing and metformin safety",
        cardType: "gap",
        availability: "not_documented",
        searched: { eligible: 8, total: 8, asOf: "2016-04-15" },
      }),
    ],
  },
  {
    id: "carotid",
    title: "Carotid stenosis",
    cards: [
      card({
        id: "card-carotid",
        needId: "carotid_stenosis",
        title: "Carotid stenosis",
        why: "Stroke risk with blood pressure drops under anaesthesia",
        conflict: "contradicted",
        findingIds: ["finding-c1"],
        lines: [
          line("carotid-right", "Internal carotid stenosis about 60%, right · Duplex findings, Jun 2015", "12340012", "done"),
          line("carotid-left", "Internal carotid stenosis max. 60%, left · Overall assessment, Jun 2015", "12340012", "done"),
        ],
      }),
    ],
  },
  {
    id: "labs",
    title: "Labs",
    cards: [
      card({
        id: "card-labs",
        needId: "labs",
        title: "Recent labs",
        why: "Baseline blood count and electrolytes",
        availability: "unavailable",
      }),
    ],
  },
];

const efHeadline: Claim = {
  id: "claim-ef-headline",
  kind: "composed",
  text: "Normal systolic function, last measured June 2015",
  factIds: ["fact-ef"],
  segmentIds: ["seg-12340012-ef"],
  author: "machine",
  validation: supported,
};

const findings: Finding[] = [
  {
    id: "finding-c1",
    type: "contradiction",
    title: "Carotid stenosis side",
    explanation:
      "Within one section of the June 2015 letter, the findings put the 60% stenosis on the right and the overall assessment puts it on the left.",
    severity: "high",
    computation: null,
    hypothesisText: null,
    passages: [
      {
        segmentId: "seg-12340012-carotid-right",
        documentId: "12340012",
        factId: "fact-carotid-right",
        quote: "Rechts findet sich in der A. carotis interna … zu etwa 60%",
        start: 3527,
        end: 3600,
        claimEn: "About 60% stenosis of the right internal carotid artery",
      },
      {
        segmentId: "seg-12340012-carotid-left",
        documentId: "12340012",
        factId: "fact-carotid-left",
        quote: "Maximal 60%ige Abgangsstenose der Arteria carotis interna links.",
        start: 3969,
        end: 4033,
        claimEn: "At most 60% stenosis at the origin of the left internal carotid artery",
      },
    ],
  },
];

const sectionById = new Map(sections.map((s) => [s.id, s]));

/** Sections arrive in completion order, not screen order; the UI places them by `sectionTitles`. */
const timeline: { atMs: number; event: LensEvent }[] = [
  {
    atMs: 40,
    event: {
      type: "situation",
      lensKey: "mock-situation-1",
      patient,
      situation,
      window,
      sectionTitles: sections.map(({ id, title }) => ({ id, title })),
    },
  },
  ...(
    [
      [1300, "critical"],
      [1350, "procedure"],
      [1900, "diabetes"],
      [2100, "cardiac"],
      [2200, "blood_pressure"],
      [2500, "carotid"],
      [2900, "kidney"],
      [3100, "labs"],
    ] as const
  ).map(([atMs, id]) => ({
    atMs,
    event: { type: "section", section: sectionById.get(id)! } satisfies LensEvent,
  })),
  { atMs: 3250, event: { type: "headline", cardId: "card-ef", headline: efHeadline } },
  {
    atMs: 3300,
    event: {
      type: "findings",
      critical: ["card-allergies", "card-antithrombotics"],
      findings,
      openQuestions: [
        { id: "oq-c1", kind: "contradiction", title: "Carotid stenosis side documented inconsistently", findingId: "finding-c1" },
        { id: "oq-kidney", kind: "missing", title: "Kidney function not documented", cardId: "card-kidney", needId: "kidney_function" },
      ],
    },
  },
  {
    atMs: 3400,
    event: {
      type: "done",
      timings: { planMs: 40, firstSectionMs: 1300, totalMs: 3400, cached: false },
    },
  },
];

export const mockLensEvents: LensEvent[] = timeline.map((t) => t.event);

/** Replays situation 1 with realistic cold-path timing; `speed` > 1 replays faster. */
export async function* mockLensStream(speed = 1): AsyncGenerator<LensEvent> {
  let elapsed = 0;
  for (const { atMs, event } of timeline) {
    await new Promise((resolve) => setTimeout(resolve, (atMs - elapsed) / speed));
    elapsed = atMs;
    yield event;
  }
}
