import type { EvidenceWindow } from "@medlyn/engine/contracts";
import { loadFindings } from "@medlyn/engine/store";
import { FindingsCompare } from "@/components/gen-ui/findings-compare";
import { activePatientId } from "@/lib/patient-server";
import { SharedDataView } from "./shared-data-view";
export async function ImagingFindings({ window }: { window: EvidenceWindow }) {
  try {
    const findings = await loadFindings(window, await activePatientId());
    if (!findings.length) return null;
    return (
      <SharedDataView>
        <FindingsCompare state="output-available" output={{ asOf: window.asOf, findings }} />
      </SharedDataView>
    );
  } catch (error) {
    console.error(
      "Imaging findings unavailable",
      error instanceof Error ? error.message : String(error),
    );
    return (
      <FindingsCompare
        state="output-error"
        errorText="Couldn't check the adjudicated findings. Try this page again."
      />
    );
  }
}
