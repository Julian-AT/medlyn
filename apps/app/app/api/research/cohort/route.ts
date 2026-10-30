import { reportFile, sampleRecords } from "../report-files";
import { cohortSnapshot } from "../snapshot";
import { cohortReport } from "./cohort-report";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.NODE_ENV === "production") return Response.json(cohortSnapshot);
  const [full, sample, patients] = await Promise.all([
    reportFile("ml/data/synth-v1/manifest.json"),
    reportFile("ml/data/sample/manifest.json"),
    sampleRecords(),
  ]);
  const report =
    full || sample
      ? cohortReport(full ?? sample, patients, full ? "full" : "sample")
      : cohortSnapshot;
  return Response.json(
    { ...report, samples: patients.length ? report.samples : cohortSnapshot.samples },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
