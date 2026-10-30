import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

export function WorkflowLinks({ lensKey }: { lensKey: string }) {
  const query = `?lensKey=${encodeURIComponent(lensKey)}`;
  return (
    <CardContent className="flex flex-wrap gap-2 p-0 print:hidden">
      <Button asChild size="sm" variant="outline">
        <Link href={`/open-questions${query}`}>Open patient questions</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={`/letter${query}`}>Draft GP letter</Link>
      </Button>
    </CardContent>
  );
}
