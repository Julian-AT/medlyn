import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const ROWS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

export function MedicationSkeleton() {
  return (
    <CardContent
      className="flex min-w-0 flex-col gap-6 p-0"
      role="status"
      aria-label="Loading medication lists"
    >
      <CardContent className="flex flex-col gap-3 p-0" aria-hidden="true">
        <Skeleton className="h-4 w-24 animate-none" />
        <Skeleton className="h-11 w-full max-w-[580px] animate-none rounded-xl" />
      </CardContent>
      <Card className="gap-0 rounded-2xl border py-0 shadow-none ring-0" aria-hidden="true">
        <CardHeader className="flex h-14 flex-row items-center justify-between p-4">
          <Skeleton className="h-4 w-28 animate-none" />
          <Skeleton className="h-5 w-24 animate-none rounded-full" />
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[780px]">
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row} className="h-[76px] hover:bg-transparent">
                  <TableCell className="w-full pl-4">
                    <Skeleton className="mb-2 h-4 w-36 animate-none" />
                    <Skeleton className="h-3 w-20 animate-none" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 animate-none" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-60 animate-none" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12 animate-none" />
                  </TableCell>
                  <TableCell className="pr-4">
                    <Skeleton className="h-5 w-16 animate-none rounded-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CardContent className="flex flex-col gap-3 p-0" aria-hidden="true">
        <Skeleton className="h-5 w-60 animate-none" />
        <Skeleton className="h-4 w-48 animate-none" />
      </CardContent>
    </CardContent>
  );
}
