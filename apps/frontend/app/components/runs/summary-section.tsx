import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { SectionHeader } from "app/components/ui/run-elements";
import { RawSuspensionData, normalizeToPercentage, getProfileFromRun } from "app/lib/telemetryUtils";
import { cn } from "app/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface SummarySectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

function calculateDynamicSag(
  run: Run,
  jsonData: Record<number, RunJson>,
  type: 'front' | 'rear',
): number | null {
  const suspensionData: RawSuspensionData[] | undefined =
    jsonData[run.id]?.data?.suspension?.[type === 'front' ? 'front_sus' : 'rear_sus'];

  if (!suspensionData || suspensionData.length === 0) return null;

  const profile = getProfileFromRun(run);
  const min = profile ? (type === 'front' ? profile.front_min : profile.back_min) : undefined;
  const max = profile ? (type === 'front' ? profile.front_max : profile.back_max) : undefined;

  const normalized = suspensionData
    .map(p => {
      const val = typeof p === 'number' ? p : Number(p.displacement ?? 0);
      return normalizeToPercentage(val, min, max);
    })
    .filter(v => isFinite(v));

  if (normalized.length === 0) return null;

  const sorted = [...normalized].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!;

  return median;
}

function calculateTravelZone(
  run: Run,
  jsonData: Record<number, RunJson>,
  type: 'front' | 'rear',
  lowerBound: number,
  upperBound: number,
): number | null {
  const suspensionData: RawSuspensionData[] | undefined =
    jsonData[run.id]?.data?.suspension?.[type === 'front' ? 'front_sus' : 'rear_sus'];
  if (!suspensionData || suspensionData.length === 0) return null;

  const profile = getProfileFromRun(run);
  const min = profile ? (type === 'front' ? profile.front_min : profile.back_min) : undefined;
  const max = profile ? (type === 'front' ? profile.front_max : profile.back_max) : undefined;

  const normalized = suspensionData
    .map(p => {
      const val = typeof p === 'number' ? p : Number(p.displacement ?? 0);
      return normalizeToPercentage(val, min, max);
    })
    .filter(v => isFinite(v));

  if (normalized.length === 0) return null;

  const inZone = normalized.filter(v => v >= lowerBound && v <= upperBound).length;
  return (inZone / normalized.length) * 100;
}

function calculateTravelZoneSeconds(
  run: Run,
  jsonData: Record<number, RunJson>,
  type: 'front' | 'rear',
  lowerBound: number,
  upperBound: number,
): number | null {
  const freq = type === 'front' ? run.front_freq : run.rear_freq;
  if (!freq) return null;

  const suspensionData: RawSuspensionData[] | undefined =
    jsonData[run.id]?.data?.suspension?.[type === 'front' ? 'front_sus' : 'rear_sus'];
  if (!suspensionData || suspensionData.length === 0) return null;

  const profile = getProfileFromRun(run);
  const min = profile ? (type === 'front' ? profile.front_min : profile.back_min) : undefined;
  const max = profile ? (type === 'front' ? profile.front_max : profile.back_max) : undefined;

  const normalized = suspensionData
    .map(p => {
      const val = typeof p === 'number' ? p : Number(p.displacement ?? 0);
      return normalizeToPercentage(val, min, max);
    })
    .filter(v => isFinite(v));

  if (normalized.length === 0) return null;

  const inZone = normalized.filter(v => v >= lowerBound && v <= upperBound).length;
  return inZone / freq;
}

interface SagCellProps {
  value: number | null;
  type: 'front' | 'rear';
}

function SagCell({ value, type }: SagCellProps) {
  if (value === null) return <span>—</span>;

  const component = type === 'front' ? 'fork' : 'shock';
  const inRange = value >= 25 && value <= 35;

  const pillClass = cn(
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
    inRange ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
  );

  return (
    <span className={pillClass}>
      {value.toFixed(1)}%
      {!inRange && value < 25 && (
        <span title={`Reduce pressure in the ${component}`}>
          <ArrowUp size={12} />
        </span>
      )}
      {!inRange && value > 35 && (
        <span title={`Increase pressure in the ${component}`}>
          <ArrowDown size={12} />
        </span>
      )}
    </span>
  );
}

interface TravelZoneCellProps {
  value: number | null;
  seconds?: number | null;
}

function TravelZoneCell({ value, seconds }: TravelZoneCellProps) {
  if (value === null) return <span>—</span>;

  // TODO: add red threshold logic when thresholds are decided
  const pillClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800";
  const tooltip = seconds != null ? `${seconds.toFixed(2)} s` : undefined;

  return <span className={pillClass} title={tooltip}>{value.toFixed(1)}%</span>;
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
              className="px-3 py-2 font-semibold text-foreground text-center border-l border-border"
              scope="col"
              colSpan={5}
            >
              Fork
            </th>
            <th
              className="px-3 py-2 font-semibold text-foreground text-center border-l border-border"
              scope="col"
              colSpan={5}
            >
              Shock
            </th>
          </tr>
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              &nbsp;
            </th>
            <th className="px-3 py-2 font-semibold text-foreground border-l border-border" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottomed Out</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Off Ground</th>
            <th className="px-3 py-2 font-semibold text-foreground border-l border-border" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottomed Out</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Off Ground</th>
          </tr>
        </thead>
        <tbody>
          {selected.map((run) => (
            <tr key={run.id} className="border-t border-border">
              <td className="px-3 py-2 text-foreground">
                {run.title || `Run ${run.id}`}
              </td>
              <td className="px-3 py-2 border-l border-border">
                <SagCell value={calculateDynamicSag(run, jsonData, 'front')} type="front" />
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateCompression(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateRebound(run, jsonData)}
              </td>
              <td className="px-3 py-2">
                <TravelZoneCell
                  value={calculateTravelZone(run, jsonData, 'front', 95, 100)}
                  seconds={calculateTravelZoneSeconds(run, jsonData, 'front', 95, 100)}
                />
              </td>
              <td className="px-3 py-2">
                <TravelZoneCell
                  value={calculateTravelZone(run, jsonData, 'front', 0, 5)}
                  seconds={calculateTravelZoneSeconds(run, jsonData, 'front', 0, 5)}
                />
              </td>
              <td className="px-3 py-2 border-l border-border">
                <SagCell value={calculateDynamicSag(run, jsonData, 'rear')} type="rear" />
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateCompression(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateRebound(run, jsonData)}
              </td>
              <td className="px-3 py-2">
                <TravelZoneCell
                  value={calculateTravelZone(run, jsonData, 'rear', 95, 100)}
                  seconds={calculateTravelZoneSeconds(run, jsonData, 'rear', 95, 100)}
                />
              </td>
              <td className="px-3 py-2">
                <TravelZoneCell
                  value={calculateTravelZone(run, jsonData, 'rear', 0, 5)}
                  seconds={calculateTravelZoneSeconds(run, jsonData, 'rear', 0, 5)}
                />
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
