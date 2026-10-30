import { reportFile, sampleRecords } from "../report-files";
import { cohortReport } from "./cohort-report";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const [full, sample, patients] = await Promise.all([
    reportFile("ml/data/synth-v1/manifest.json"),
    reportFile("ml/data/sample/manifest.json"),
    sampleRecords(),
  ]);
  return Response.json(cohortReport(full ?? sample, patients, full ? "full" : "sample"), {
    headers: { "Cache-Control": "no-store" },
  });
}
