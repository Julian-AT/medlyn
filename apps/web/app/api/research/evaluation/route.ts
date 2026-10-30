import { reportFile } from "../report-files";
import { evaluationReport } from "./evaluation-report";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const [regression, synthetic, verifier] = await Promise.all([
    reportFile("eval/output/regression.json"),
    reportFile("eval/output/synthetic.json"),
    reportFile("ml/verifier/results.json"),
  ]);
  return Response.json(evaluationReport(regression, synthetic, verifier), {
    headers: { "Cache-Control": "no-store" },
  });
}
