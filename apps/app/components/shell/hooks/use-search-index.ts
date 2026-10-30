"use client";

import type { Document, Fact } from "@medlyn/engine/contracts";
import { useEffect, useRef, useState } from "react";

type SearchFact = Pick<Fact, "id" | "labelEn"> & { href: string };

const CATEGORY: Partial<Record<Fact["kind"], string>> = {
  medication: "medications",
  diagnosis: "diagnoses",
  lab: "labs",
  measurement: "labs",
  imaging: "imaging",
  histology: "oncology",
  receptor: "oncology",
  staging: "oncology",
  procedure: "procedures",
  allergy: "allergies",
};

/** Loads documents and facts for the command palette the first time it opens. */
export function useSearchIndex(open: boolean) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [facts, setFacts] = useState<SearchFact[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    const load = async <T>(url: string): Promise<T | null> => {
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    };
    void Promise.all([
      load<{ documents: Document[] }>("/api/patient/documents"),
      load<{ facts: Fact[] }>("/api/patient/facts"),
    ])
      .then(([documentData, factData]) => {
        setDocuments(documentData?.documents ?? []);
        const seen = new Set<string>();
        setFacts(
          (factData?.facts ?? [])
            .filter((fact) => !seen.has(fact.labelEn) && seen.add(fact.labelEn))
            .map((fact) => ({
              id: fact.id,
              labelEn: fact.labelEn,
              href: `/patient/${CATEGORY[fact.kind] ?? "timeline"}`,
            })),
        );
      })
      .catch((error: unknown) => {
        console.warn("search_index_failed", error);
        started.current = false;
      });
  }, [open]);

  return { documents, facts };
}
