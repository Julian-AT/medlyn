import type { QuantumReport } from "@/app/api/research/evaluation/quantum-report";
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
import { percent } from "./report-values";

const models = [
  { key: "quantum_fidelity", label: "ZZ fidelity kernel" },
  { key: "rbf_svm", label: "RBF-SVM" },
  { key: "logistic", label: "Logistic regression" },
] as const;

export function QuantumCard({ results }: { results: QuantumReport }) {
  const offline = results.featureEncoder.startsWith("offline");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quantum research experiment</CardTitle>
        <CardDescription>Research only; not used in the product.</CardDescription>
        <Badge variant="secondary">Automated · human check pending</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription>
          IBM Qiskit: an eight-qubit claim classifier and QAOA evidence selection on five synthetic
          cases. No clinical advantage or quantum speedup established.
        </CardDescription>
        <CardDescription>
          {offline
            ? "Offline character-hash control. Gemini embeddings are pending because the daily API quota was exhausted."
            : "Gemini Embedding 2 features, reduced to eight dimensions using training data only."}{" "}
          {results.train} training and {results.test} test examples; balanced supported versus not
          supported.
        </CardDescription>
        <Table aria-label="Exploratory quantum classifier results">
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead className="text-right">95% interval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map(({ key, label }) => {
              const model = results.models.find((item) => item.key === key);
              return (
                <TableRow key={key}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {percent(model?.accuracy ?? null)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {[model?.low ?? null, model?.high ?? null].map(percent).join(" to ")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <CardDescription>
          Patient-bootstrap intervals; synthetic labels are code checked, not human gold. These
          binary results are separate from the three-class verifier benchmark.
        </CardDescription>
        <CardDescription>
          Full kernels use exact simulation, with a finite-shot 16 × 16 cross-check. QAOA depths 1–3
          completed on {results.qaoaInstances} small cases; exhaustive search remains practical at
          this scale.
        </CardDescription>
        <CardDescription>
          IBM hardware: {results.hardwareComplete ? "recorded" : "pending"}. No held-out hardware
          classifier accuracy is available.
        </CardDescription>
      </CardContent>
    </Card>
  );
}
