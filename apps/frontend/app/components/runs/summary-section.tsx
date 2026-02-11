import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { SectionHeader } from "app/components/ui/run-elements";
import {
  RawSuspensionData,
  normalizeToPercentage,
} from "app/lib/telemetryUtils";

interface SummarySectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

function getDisplacementValue(sample: RawSuspensionData): number {
  if (typeof sample === "number") return sample;
  if (sample && typeof sample === "object") {
    return Number(sample.displacement ?? 0);
  }

  return 0;
}

function calculateDynamicSag(
  suspensionData: RawSuspensionData[] | undefined,
  min?: number,
  max?: number,
) {
  if (!Array.isArray(suspensionData) || suspensionData.length === 0) {
    return "N/A";
  }

  const total = suspensionData.reduce((sum, sample) => {
    return sum + normalizeToPercentage(getDisplacementValue(sample), min, max);
  }, 0);

  return `${(total / suspensionData.length).toFixed(1)}%`;
}

function calculateCompression(suspensionData: RawSuspensionData[] | undefined) {
  if (!Array.isArray(suspensionData) || suspensionData.length < 2) {
    return "N/A";
  }

  let compressionCount = 0;
  let motionSamples = 0;

  for (let index = 1; index < suspensionData.length; index += 1) {
    const previous = getDisplacementValue(suspensionData[index - 1]!);
    const current = getDisplacementValue(suspensionData[index]!);
    const delta = current - previous;

    if (delta === 0) continue;

    motionSamples += 1;
    if (delta > 0) compressionCount += 1;
  }

  if (motionSamples === 0) return "N/A";
  return `${((compressionCount / motionSamples) * 100).toFixed(1)}%`;
}

function calculateRebound(suspensionData: RawSuspensionData[] | undefined) {
  if (!Array.isArray(suspensionData) || suspensionData.length < 2) {
    return "N/A";
  }

  let reboundCount = 0;
  let motionSamples = 0;

  for (let index = 1; index < suspensionData.length; index += 1) {
    const previous = getDisplacementValue(suspensionData[index - 1]!);
    const current = getDisplacementValue(suspensionData[index]!);
    const delta = current - previous;

    if (delta === 0) continue;

    motionSamples += 1;
    if (delta < 0) reboundCount += 1;
  }

  if (motionSamples === 0) return "N/A";
  return `${((reboundCount / motionSamples) * 100).toFixed(1)}%`;
}

interface ProfileRanges {
  front_min?: number;
  front_max?: number;
  back_min?: number;
  back_max?: number;
}

interface RunWithProfile extends Run {
  profile?: ProfileRanges | null;
  profile_id?: ProfileRanges | null;
}

interface SummaryTableProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
}

function SummaryTable({ selected, jsonData }: SummaryTableProps) {
  if (!selected || selected.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No runs selected.</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-white">
      <table className="min-w-[900px] w-full text-sm bg-white">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Run
            </th>
            <th
              className="px-3 py-2 font-semibold text-foreground text-center"
              scope="col"
              colSpan={3}
            >
              Fork
            </th>
            <th
              className="px-3 py-2 font-semibold text-foreground text-center"
              scope="col"
              colSpan={3}
            >
              Shock
            </th>
          </tr>
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              &nbsp;
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
          </tr>
        </thead>
        <tbody>
          {selected.map((run) => (
            <tr key={run.id} className="border-t border-border">
              <td className="px-3 py-2 text-foreground">
                {run.title || `Run ${run.id}`}
              </td>
              {(() => {
                const runWithProfile = run as RunWithProfile;
                const profile =
                  runWithProfile.profile ?? runWithProfile.profile_id ?? null;
                const frontData = jsonData[run.id]?.data?.suspension?.front_sus;
                const rearData = jsonData[run.id]?.data?.suspension?.rear_sus;

                return (
                  <>
                    <td className="px-3 py-2 text-foreground">
                      {calculateDynamicSag(
                        frontData,
                        profile?.front_min,
                        profile?.front_max,
                      )}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {calculateCompression(frontData)}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {calculateRebound(frontData)}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {calculateDynamicSag(
                        rearData,
                        profile?.back_min,
                        profile?.back_max,
                      )}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {calculateCompression(rearData)}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {calculateRebound(rearData)}
                    </td>
                  </>
                );
              })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SummarySection({
  selected,
  jsonData,
  isCompareMode,
}: SummarySectionProps) {
  return (
    <section className="w-full">
      <SectionHeader>
        {isCompareMode ? "Comparison Summary" : "Summary"}
      </SectionHeader>
      <SummaryTable selected={selected} jsonData={jsonData} />
    </section>
  );
}
