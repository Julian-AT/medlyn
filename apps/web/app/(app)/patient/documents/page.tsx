import { evidenceWindow, loadDocuments, loadSegments } from "@medlyn/engine/store";
import type { Metadata } from "next";
import { CategoryEmpty } from "@/components/categories/category-empty";
import { DocumentsTable } from "@/components/categories/documents-table";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { activePatientId } from "@/lib/patient-server";
export const metadata: Metadata = { title: "Documents · Medlyn" };

export const dynamic = "force-dynamic";
export default async function Page() {
  let documents = null;
  try {
    const patientId = await activePatientId();
    const window = await evidenceWindow(undefined, patientId);
    const [docs, segments] = await Promise.all([
      loadDocuments(window, patientId),
      loadSegments(window),
    ]);
    documents = docs.map(({ normText, ...doc }) => ({
      ...doc,
      segmentId: segments.find((segment) => segment.documentId === doc.id)?.id ?? null,
    }));
  } catch (error) {
    console.error("Documents unavailable", error instanceof Error ? error.message : String(error));
  }
  return (
    <PageShell>
      <PageHeading
        title="Documents"
        description="The original clinical record, with German passages and available English translations."
      />
      {documents ? <DocumentsTable documents={documents} /> : <CategoryEmpty unavailable />}
    </PageShell>
  );
}
