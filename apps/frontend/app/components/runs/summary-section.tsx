import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { SectionHeader } from "app/components/ui/run-elements";
import { RawSuspensionData, normalizeToPercentage, getProfileFromRun } from "app/lib/telemetryUtils";

interface SummarySectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

function calculateDynamicSag(
  run: Run,
  jsonData: Record<number, RunJson>,
  type: 'front' | 'rear',
): string {
  const suspensionData: RawSuspensionData[] | undefined =
    jsonData[run.id]?.data?.suspension?.[type === 'front' ? 'front_sus' : 'rear_sus'];

  if (!suspensionData || suspensionData.length === 0) return "—";

  const profile = getProfileFromRun(run);
  const min = profile ? (type === 'front' ? profile.front_min : profile.back_min) : undefined;
  const max = profile ? (type === 'front' ? profile.front_max : profile.back_max) : undefined;

  const normalized = suspensionData
    .map(p => {
      const val = typeof p === 'number' ? p : Number(p.displacement ?? 0);
      return normalizeToPercentage(val, min, max);
    })
    .filter(v => isFinite(v));

  if (normalized.length === 0) return "—";

  const sorted = [...normalized].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;

  return `${median.toFixed(1)}%`;
}

function calculateCompression(_run: Run, _jsonData: Record<number, RunJson>) {
  return 0;
}

function calculateRebound(_run: Run, _jsonData: Record<number, RunJson>) {
  return 0;
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
              <td className="px-3 py-2 text-foreground">
                {calculateDynamicSag(run, jsonData, 'front')}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateCompression(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateRebound(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateDynamicSag(run, jsonData, 'rear')}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateCompression(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateRebound(run, jsonData)}
              </td>
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
      <SectionHeader>{isCompareMode ? "Comparison Summary" : "Summary"}</SectionHeader>
      <SummaryTable selected={selected} jsonData={jsonData} />
    </section>
  );
}
