import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
export function CategoryEmpty({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <Empty className="min-h-64">
      <EmptyHeader>
        <EmptyTitle>
          {unavailable ? "Couldn't load this record" : "No verified entries to display"}
        </EmptyTitle>
        <EmptyDescription>
          {unavailable
            ? "The patient record is temporarily unavailable. Try this page again."
            : "This view contains only source-supported entries. Open a situation to check a specific clinical question."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button className="rounded-full" variant="outline" asChild>
          <Link href="/situations">Open Situations</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
