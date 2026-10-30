import type { Finding } from "@medlyn/engine/contracts";

type Anchor = { documentId: string; start: number; end: number };
export type FindingFixture = {
  id: string;
  category: "contradiction" | "needs_clarification" | "dismissed";
  anchors: Anchor[];
};
const a = (documentId: string, start: number, end: number): Anchor => ({ documentId, start, end });

export const findingFixtures: FindingFixture[] = [
  {
    id: "C1",
    category: "contradiction",
    anchors: [a("12340012", 3527, 3703), a("12340012", 3969, 4033)],
  },
  {
    id: "C2",
    category: "contradiction",
    anchors: [a("12340012", 1697, 1710), a("12340012", 1711, 1725), a("12340012", 1726, 1735)],
  },
  {
    id: "C3",
    category: "contradiction",
    anchors: [a("12340014", 635, 648), a("12340014", 649, 663), a("12340014", 664, 671)],
  },
  {
    id: "C4",
    category: "contradiction",
    anchors: [a("12340016", 187, 212), a("12340018", 1054, 1109)],
  },
  {
    id: "C5",
    category: "contradiction",
    anchors: [a("12340018", 167, 194), a("12340018", 2348, 2382)],
  },
  {
    id: "D1",
    category: "needs_clarification",
    anchors: [a("12340018", 145, 166), a("12340018", 1637, 1710)],
  },
  {
    id: "D2",
    category: "needs_clarification",
    anchors: [a("12340014", 1016, 1054), a("12340018", 1340, 1378)],
  },
  {
    id: "D3",
    category: "needs_clarification",
    anchors: [a("12340018", 128, 142), a("12340016", 105, 119)],
  },
  {
    id: "X-weight-2015-early2016",
    category: "dismissed",
    anchors: [a("12340012", 1711, 1725), a("12340014", 649, 663)],
  },
  {
    id: "X-weight-april",
    category: "dismissed",
    anchors: [a("12340014", 649, 663), a("12340018", 935, 949)],
  },
  {
    id: "X-height",
    category: "dismissed",
    anchors: [a("12340012", 1697, 1710), a("12340014", 635, 648)],
  },
  {
    id: "X-admission-bp",
    category: "dismissed",
    anchors: [a("12340012", 1320, 1330), a("12340012", 1779, 1790)],
  },
  {
    id: "X-candesartan",
    category: "dismissed",
    anchors: [a("12340012", 7714, 7745), a("12340018", 2666, 2695)],
  },
  {
    id: "X-allergy-omission",
    category: "dismissed",
    anchors: [a("12340012", 474, 518), a("12340012", 2065, 2138)],
  },
];

export function overlaps(left: Anchor, right: Anchor): boolean {
  return left.documentId === right.documentId && left.start < right.end && right.start < left.end;
}

export function fixtureMatches(finding: Finding, fixture: FindingFixture): boolean {
  return fixture.anchors.every((anchor) => finding.passages.some((p) => overlaps(anchor, p)));
}

export function scoreFindings(findings: Finding[]) {
  const unique = [...new Map(findings.map((f) => [f.id, f])).values()];
  const expected = findingFixtures.filter((f) => f.category !== "dismissed");
  const matched = expected.map((fixture) => ({
    id: fixture.id,
    category: fixture.category,
    found: unique.some((f) => f.type === fixture.category && fixtureMatches(f, fixture)),
  }));
  const dismissals = findingFixtures.filter((f) => f.category === "dismissed");
  const falseAlarms = unique.filter(
    (finding) =>
      dismissals.some((f) => fixtureMatches(finding, f)) ||
      !expected.some((f) => f.category === finding.type && fixtureMatches(finding, f)),
  );
  const contradictions = matched.filter((m) => m.category === "contradiction" && m.found).length;
  return {
    matched,
    falseAlarmIds: falseAlarms.map((f) => f.id),
    contradictions,
    net: contradictions - falseAlarms.length,
  };
}
