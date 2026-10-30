"use client";
import { useState } from "react";
import type { EvaluationReport } from "@/app/api/research/evaluation/evaluation-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { count, milliseconds, percent } from "./report-values";
export function VerifierComparison({ verifier }: { verifier: EvaluationReport["verifier"] }) {
  const [selected, setSelected] = useState(verifier.sets[0]?.id ?? "");
  const set = verifier.sets.find((set) => set.id === selected) ?? verifier.sets[0];
  return (
    <Card className="min-w-0 gap-4 rounded-2xl border p-4 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>Verifier comparison</CardTitle>
        <CardDescription>
          {verifier.status || "No verifier run available"}. Confidence intervals are shown only when
          present in the report.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4 p-0">
        {set && (
          <>
            <Select value={set.id} onValueChange={setSelected}>
              <SelectTrigger className="h-9 w-full sm:w-80" aria-label="Verifier evaluation set">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {verifier.sets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Table className="table-fixed [&_th]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Macro-F1 / 95% CI</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>p50 / p95</TableHead>
                  <TableHead>ECE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {set.methods.map((method) => (
                  <TableRow key={method.method}>
                    <TableCell className="whitespace-normal">{method.method}</TableCell>
                    <TableCell className="whitespace-normal tabular-nums">
                      {percent(method.macroF1)}
                      <CardDescription className="text-xs tabular-nums">
                        {method.low !== null && method.high !== null
                          ? `${percent(method.low)}–${percent(method.high)} · ${method.intervalUnit} bootstrap`
                          : "CI unmeasured"}
                      </CardDescription>
                    </TableCell>
                    <TableCell className="tabular-nums">{count(method.n)}</TableCell>
                    <TableCell className="whitespace-normal tabular-nums">
                      {milliseconds(method.p50Ms)} / {milliseconds(method.p95Ms)}
                    </TableCell>
                    <TableCell className="whitespace-normal tabular-nums">
                      {percent(method.ece)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        <CardDescription>
          Training: {verifier.training || "No training status reported"}
        </CardDescription>
        <CardDescription>Cascade: {verifier.cascade || "Unmeasured"}</CardDescription>
        {verifier.limitations.map((limitation) => (
          <CardDescription key={limitation} className="text-xs">
            {limitation}
          </CardDescription>
        ))}
      </CardContent>
    </Card>
  );
}
