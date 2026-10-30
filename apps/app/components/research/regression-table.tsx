import type { EvaluationReport } from "@/app/api/research/evaluation/evaluation-report";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { milliseconds, percent } from "./report-values";
export function RegressionTable({ regression }: { regression: EvaluationReport["regression"] }) {
  return (
    <Card className="min-w-0 gap-4 rounded-2xl border p-4 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>Real patient regression</CardTitle>
        <CardDescription>
          Five challenge situations, with an empty review layer. Findings counts are per captured
          screen; repeated findings are not pooled.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="table-fixed [&_th]:whitespace-normal">
          <TableHeader>
            <TableRow>
              <TableHead>Situation / answer</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Citation</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Contradictions / clarifications</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regression.cases.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="tabular-nums">{row.id}</TableCell>
                <TableCell>
                  <Badge variant={row.pass ? "outline" : "destructive"}>
                    {row.pass ? "Pass" : "Fail"}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{percent(row.citation)}</TableCell>
                <TableCell className="tabular-nums whitespace-normal">
                  {milliseconds(row.latencyMs)}
                  <CardDescription className="text-xs">
                    {row.phase === "warm"
                      ? "Warm capture"
                      : row.phase === "cold"
                        ? "Cold capture"
                        : "Saved capture"}
                  </CardDescription>
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.contradictions} / {row.clarifications}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!regression.cases.length && (
          <CardDescription className="py-8 text-center">
            No regression report available.
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
