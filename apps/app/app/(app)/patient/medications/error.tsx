"use client";

import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

export default function MedicationError({ retry }: { retry: () => void }) {
  return (
    <PageShell>
      <PageHeading
        category="medications"
        title="Medications"
        description="Discharge medication lists as documented"
      />
      <CardContent className="flex min-h-80 flex-col gap-4 p-0">
        <Alert variant="destructive">
          <AlertTitle>Couldn't load medication lists</AlertTitle>
          <AlertDescription>
            The source lists are temporarily unavailable. Try loading them again.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-fit rounded-full" onClick={retry}>
          Try again
        </Button>
      </CardContent>
    </PageShell>
  );
}
