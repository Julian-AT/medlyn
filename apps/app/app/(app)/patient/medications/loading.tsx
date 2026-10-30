import { MedicationSkeleton } from "@/components/categories/medication-skeleton";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <PageHeading
        category="medications"
        title="Medications"
        description="Discharge medication lists as documented"
      />
      <MedicationSkeleton />
    </PageShell>
  );
}
