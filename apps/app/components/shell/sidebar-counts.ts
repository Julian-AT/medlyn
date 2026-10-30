import type { Fact, Finding } from "@medlyn/engine/contracts";
import { categories } from "../categories/category-config.ts";

export function sidebarCounts(facts: Fact[], documentCount: number) {
  const counts: Record<string, number> = {
    "/patient": facts.length,
    "/patient/documents": documentCount,
  };
  for (const [category, config] of Object.entries(categories)) {
    counts[`/patient/${category}`] = facts.filter(
      (fact) =>
        config.kinds.includes(fact.kind) &&
        (category !== "oncology" ||
          ["histology", "staging", "receptor"].includes(fact.kind) ||
          /carcinoma|ductal|tumou?r|board|oncolog|iort|breast|mamma|quadrant|bi-rads|axill/i.test(
            `${fact.labelEn ?? ""} ${JSON.stringify(fact.attrs ?? {})}`,
          )),
    ).length;
  }
  return counts;
}

export function findingCounts(findings: Finding[]) {
  return {
    open: findings.filter((finding) => finding.review?.action !== "dismissed").length,
    contradictions: findings.some(
      (finding) => finding.type === "contradiction" && finding.review?.action !== "dismissed",
    ),
  };
}
