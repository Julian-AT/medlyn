import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function MedicationEmptyState() {
  return (
    <Empty className="min-h-80 rounded-2xl border">
      <EmptyHeader>
        <EmptyTitle>No verified medication lists to display</EmptyTitle>
        <EmptyDescription>
          Open a situation to investigate a medication or check its source documents.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" className="rounded-full" asChild>
          <Link href="/situations">Open a situation</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
