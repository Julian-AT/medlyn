"use client";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import type { CohortReport } from "@/app/api/research/cohort/cohort-report";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export function SampleBrowser({ samples }: { samples: CohortReport["samples"] }) {
  const [selected, setSelected] = useState(samples[0]?.id ?? "");
  const patient = samples.find((item) => item.id === selected) ?? samples[0];
  return (
    <Card className="min-w-0 gap-4 rounded-2xl border p-4 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>Sample patient browser</CardTitle>
        <CardDescription>
          {samples.length} fresh synthetic sample records. Labels describe the generated dataset;
          they are not validated clinical output.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4 p-0">
        {patient ? (
          <>
            <Select value={patient.id} onValueChange={setSelected}>
              <SelectTrigger aria-label="Sample patient" className="h-9 w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {samples.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {item.split}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CardContent className="flex flex-wrap gap-2 p-0">
              <Badge variant="secondary">{patient.scenario}</Badge>
              <Badge variant="outline">{patient.style}</Badge>
              <Badge variant="outline">{patient.split}</Badge>
              {patient.rewritten && <Badge variant="outline">Prose rewritten</Badge>}
            </CardContent>
            <Tabs defaultValue="facts" className="min-w-0">
              <TabsList aria-label="Sample label views">
                <TabsTrigger value="facts">Fact labels · {patient.facts.length}</TabsTrigger>
                <TabsTrigger value="documents">Documents · {patient.documents.length}</TabsTrigger>
                <TabsTrigger value="mutations">Mutations & gaps</TabsTrigger>
              </TabsList>
              <TabsContent value="facts">
                <ScrollArea className="h-80">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">Label</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patient.facts.map((fact) => (
                        <TableRow key={fact.id}>
                          <TableCell className="whitespace-normal break-words">
                            {fact.label}
                          </TableCell>
                          <TableCell className="whitespace-normal">{fact.kind}</TableCell>
                          <TableCell className="whitespace-normal">
                            {fact.assertion} · {fact.status}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="documents">
                <ScrollArea className="h-80">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead className="w-32">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patient.documents.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell className="whitespace-normal break-words" lang="de">
                            {document.title}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatDate(document.date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="mutations">
                <ScrollArea className="h-80">
                  <CardContent className="space-y-3 p-4">
                    <CardTitle>Controlled mutations</CardTitle>
                    <CardDescription>
                      {patient.mutations.join(", ") || "No controlled mutations in this sample."}
                    </CardDescription>
                    <CardDescription>
                      {patient.contradictions} labelled contradictions
                    </CardDescription>
                    <CardTitle>Documentation gaps</CardTitle>
                    {patient.gaps.map((gap) => (
                      <CardDescription key={gap}>{gap}</CardDescription>
                    ))}
                  </CardContent>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <CardDescription>
            Sample records are unavailable. Restore the committed sample and reload.
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
