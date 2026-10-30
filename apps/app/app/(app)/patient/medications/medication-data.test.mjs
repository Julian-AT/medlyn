import { describe, expect, it } from "vitest";
import {
  compareMedicationLists,
  medicationChangeValues,
} from "../../../../components/categories/medication-comparison.tsx";
import { medicationSourceLists } from "../../../../components/categories/medication-data.tsx";
import {
  medicationDose,
  medicationListLabel,
  medicationRoute,
  medicationStrength,
  medicationSummary,
} from "../../../../components/categories/medication-format.tsx";

function entry(id, documentId = "example-new", attrs = {}, state = {}) {
  const fact = {
    id,
    documentId,
    segmentId: `${documentId}-${id}`,
    kind: "medication",
    locationOk: true,
    attrs: {
      generic: "Example medicine",
      brand: "Example brand",
      strength: "20 mg",
      unit: "ST",
      route: "oral",
      schedule: ["1", "0", "1/2", "0"],
      scheduleText: null,
      listLabel: "Discharge medication",
      atc: null,
      ...attrs,
    },
  };
  const evidence = {
    factId: id,
    documentId,
    segmentId: fact.segmentId,
    quote: "Synthetic example only",
    schedule: "1-0-½",
    line: {
      id: `claim-${id}`,
      kind: "template",
      text: "Synthetic example only",
      factIds: [id],
      segmentIds: [fact.segmentId],
      validation: { key: `validation-${id}`, support: "supported" },
      assertion: "present",
      temporalStatus: "ongoing",
      ...state,
    },
  };
  return { fact, evidence };
}

function list(rows, date = "2024-06-01") {
  return {
    listLabel: `Discharge medication, ${date}`,
    documentId: rows[0]?.fact.documentId ?? "example-empty",
    date,
    lines: rows.map(({ evidence }) => evidence),
  };
}

function project(...lists) {
  const facts = new Map(lists.flat().map(({ fact }) => [fact.id, fact]));
  return medicationSourceLists(
    lists.map((rows, index) => list(rows, index === 0 ? "2024-06-01" : "2023-06-01")),
    facts,
  );
}

describe("checked medication list projection", () => {
  it("orders source lists newest first with readable source dates", () => {
    const newest = entry("new");
    const oldest = entry("old", "example-old");
    const facts = new Map([newest, oldest].map(({ fact }) => [fact.id, fact]));
    const lists = medicationSourceLists([list([oldest], "2023-06-01"), list([newest])], facts);
    expect(lists.map((item) => item.date)).toEqual(["2024-06-01", "2023-06-01"]);
    expect(lists[0].listLabel).toBe("Discharge medication, 1 Jun 2024");
  });

  it("deduplicates identical rows while keeping both exact source passages", () => {
    const [source] = project([
      entry("a"),
      entry("b", "example-new", { schedule: ["1", "0", "½", "0"] }),
    ]);
    expect(source.entries).toHaveLength(1);
    expect(source.entries[0].sources.map((row) => row.factId)).toEqual(["a", "b"]);
  });

  it("keeps distinct strengths and independent assertion states", () => {
    const [source] = project([
      entry("a"),
      entry("b", "example-new", { strength: "40 mg" }),
      entry("c", "example-new", {}, { assertion: "negated" }),
    ]);
    expect(source.entries).toHaveLength(3);
  });

  it.each(["partial", "unsupported"])("excludes %s claims", (support) => {
    expect(project([entry("a", "example-new", {}, { validation: { support } })])).toEqual([]);
  });

  it.each(["annotation", "composed"])(
    "does not decompose %s text into medication fields",
    (kind) => {
      expect(project([entry("a", "example-new", {}, { kind })])).toEqual([]);
    },
  );

  it("rejects missing facts, wrong source identities and unlocated evidence", () => {
    const good = entry("good");
    const wrongSource = entry("wrong");
    wrongSource.evidence.segmentId = "another-passage";
    const unlocated = entry("unlocated");
    unlocated.fact.locationOk = false;
    expect(project([wrongSource, unlocated])).toEqual([]);
    expect(medicationSourceLists([list([good])], new Map())).toEqual([]);
  });

  it("rejects a claim that does not cite the displayed fact", () => {
    expect(project([entry("a", "example-new", {}, { factIds: ["unrelated"] })])).toEqual([]);
  });

  it("marks antithrombotic ATC codes without marking ordinary medicines", () => {
    const [source] = project([
      entry("a"),
      entry("b", "example-new", { atc: "B01EXAMPLE", generic: "Synthetic antithrombotic" }),
    ]);
    expect(source.entries.map((row) => row.critical)).toEqual([false, true]);
  });
});

describe("source list comparison", () => {
  function changes(newRows, oldRows) {
    const [selected, previous] = project(newRows, oldRows);
    return compareMedicationLists(previous, selected);
  }

  it("shows a schedule change with both checked evidence identities", () => {
    const result = changes(
      [entry("new", "example-new", { schedule: ["1", "0", "1", "0"] })],
      [entry("old", "example-old")],
    );
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Schedule changed");
    expect(result[0].before.evidence.factId).toBe("old");
    expect(result[0].after.evidence.factId).toBe("new");
    expect(medicationChangeValues(result[0])).toEqual(["1–0–½–0", "1–0–1–0"]);
  });

  it("ignores fraction typography and unchanged lists", () => {
    expect(
      changes(
        [entry("new", "example-new", { schedule: ["1", "0", "½", "0"] })],
        [entry("old", "example-old")],
      ),
    ).toEqual([]);
  });

  it("does not call count-unit wording or a supplemental note a regimen change", () => {
    expect(
      changes(
        [entry("new", "example-new", { unit: "Tabl.", scheduleText: null })],
        [entry("old", "example-old", { unit: "ST", scheduleText: "Source note" })],
      ),
    ).toEqual([]);
  });

  it("compares weekly instructions when there is no structured daily schedule", () => {
    const result = changes(
      [entry("new", "example-new", { schedule: null, scheduleText: "Twice weekly" })],
      [entry("old", "example-old", { schedule: null, scheduleText: "Once weekly" })],
    );
    expect(result[0].label).toBe("Schedule changed");
    expect(medicationChangeValues(result[0])).toEqual(["Once weekly", "Twice weekly"]);
  });

  it("labels membership changes without inferring treatment discontinuation", () => {
    const result = changes(
      [entry("new", "example-new", { generic: "New example" })],
      [entry("old", "example-old", { generic: "Old example" })],
    );
    expect(result.map((change) => change.label)).toEqual(["Newly listed", "No longer listed"]);
    expect(result[0].before).toBeNull();
    expect(result[1].after).toBeNull();
  });

  it("does not count planned, one-off or negated entries as ongoing list changes", () => {
    const oldRows = [entry("old", "example-old")];
    const baseline = entry("baseline");
    const extra = [
      entry(
        "planned",
        "example-new",
        { generic: "Planned example" },
        { temporalStatus: "planned" },
      ),
      entry(
        "once",
        "example-new",
        { generic: "One-off example" },
        { temporalStatus: "given_once" },
      ),
      entry("negated", "example-new", { generic: "Negated example" }, { assertion: "negated" }),
    ];
    expect(changes([baseline, ...extra], oldRows)).toEqual([]);
  });

  it("matches unchanged strengths before comparing a changed strength", () => {
    const result = changes(
      [entry("same-new"), entry("changed-new", "example-new", { strength: "60 mg" })],
      [
        entry("same-old", "example-old"),
        entry("changed-old", "example-old", { strength: "40 mg" }),
      ],
    );
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Strength changed");
    expect(result[0].before.attrs.strength).toBe("40 mg");
    expect(result[0].after.attrs.strength).toBe("60 mg");
  });
});

describe("medication display formatting", () => {
  it("preserves zero and unknown dose text while displaying common fractions", () => {
    expect(["0", "1/2", "0,5", "1/4", "0.75", "ST"].map(medicationDose)).toEqual([
      "0",
      "½",
      "½",
      "¼",
      "¾",
      "ST",
    ]);
  });

  it("does not attach tablet-count units to a drug strength", () => {
    expect(medicationStrength(entry("a").fact.attrs)).toBe("20 mg");
    expect(medicationStrength({ strength: "20", unit: "mg" })).toBe("20 mg");
  });

  it("preserves weekly schedules and route labels", () => {
    const attrs = entry("weekly", "example-new", { schedule: null, scheduleText: "Once weekly" })
      .fact.attrs;
    expect(medicationSummary(attrs)).toContain("Once weekly");
    expect(medicationRoute("s.c.")).toBe("Subcutaneous");
    expect(medicationRoute(null)).toBe("—");
    expect(medicationListLabel("Current medication, 2024-06-01")).toBe(
      "Medication list, 1 Jun 2024",
    );
  });
});
