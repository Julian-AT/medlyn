import { reportFile } from "../report-files";
import { evaluationSnapshot } from "../snapshot";
import { evaluationReport } from "./evaluation-report";
import { quantumReport } from "./quantum-report";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.NODE_ENV === "production") return Response.json(evaluationSnapshot);
  const [regression, synthetic, verifier, quantum] = await Promise.all([
    reportFile("eval/output/regression.json"),
    reportFile("eval/output/synthetic.json"),
    reportFile("ml/verifier/results.json"),
    reportFile("ml/quantum/results.json"),
  ]);
  const live = evaluationReport(regression, synthetic, verifier);
  return Response.json(
    {
      ...live,
      available: live.available || evaluationSnapshot.available,
      regression: regression ? live.regression : evaluationSnapshot.regression,
      synthetic: synthetic ? live.synthetic : evaluationSnapshot.synthetic,
      retrieval: synthetic ? live.retrieval : evaluationSnapshot.retrieval,
      verifier: verifier ? live.verifier : evaluationSnapshot.verifier,
      quantum: quantum ? quantumReport(quantum) : evaluationSnapshot.quantum,
      metrics: evaluationSnapshot.metrics,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
