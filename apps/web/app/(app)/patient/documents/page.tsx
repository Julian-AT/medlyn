import { evidenceWindow, loadDocuments, loadSegments } from "@medlyn/engine/store";
import { CategoryEmpty } from "@/components/categories/category-empty";
import { DocumentsTable } from "@/components/categories/documents-table";
import { PageHeading } from "@/components/categories/page-heading";
import { Card, CardContent } from "@/components/ui/card";
export const dynamic = "force-dynamic";
export default async function Page() {
  let documents = null;
  try {
    const window = await evidenceWindow();
    const [docs, segments] = await Promise.all([loadDocuments(window), loadSegments(window)]);
    documents = docs.map(({ normText, ...doc }) => ({
      ...doc,
      segmentId: segments.find((segment) => segment.documentId === doc.id)?.id ?? null,
    }));
  } catch (error) {
    console.error("Documents unavailable", error instanceof Error ? error.message : String(error));
  }
  return (
    <Card className="gap-8 rounded-none bg-transparent mx-auto w-full max-w-6xl px-4 py-6 shadow-none ring-0 md:px-8">
      <CardContent className="flex flex-col gap-8 px-0">
        <PageHeading
          title="Documents"
          description="The original clinical record, with German passages and available English translations."
        />
        {documents ? <DocumentsTable documents={documents} /> : <CategoryEmpty unavailable />}
      </CardContent>
    </Card>
  );
}
