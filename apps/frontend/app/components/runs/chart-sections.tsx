import { RunJson } from "app/types/runs";
import {
  DisplacementPlot,
  SeriesConfig,
} from "app/components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "app/components/graphs/domain/TravelHistogram";
import { SectionHeader } from "app/components/ui/run-elements";
import { Run } from "@repo/database";
import { RawSuspensionData } from "app/lib/telemetryUtils";

interface ChartSectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

const DEFAULT_FREQUENCY = 100; // Hz - fallback for missing metadata

// Get consistent color for a series based on index 
function getSeriesColor(runIndex: number): string {
  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];
  return colors[runIndex % colors.length]!;
}


function getSuspensionData(data: RunJson | undefined, type: 'front' | 'rear'): RawSuspensionData[] {
  if (!data || data.error) {
    return [];
  }
  const suspensionData = data?.data?.suspension?.[type === 'front' ? 'front_sus' : 'rear_sus'];
  return Array.isArray(suspensionData) ? suspensionData : [];
}

function getFrequency(run: RunItem, type: 'front' | 'rear'): number {
  const freq = type === 'front' ? run.front_freq : run.rear_freq;
  return typeof freq === 'number' ? freq : DEFAULT_FREQUENCY;
}

function getSeriesConfig(
  run: Run,
  index: number,
  jsonData: Record<number, RunJson>,
  type: "front" | "rear",
  customLabel?: string,
  dynamicSag?: boolean
): SeriesConfig {
  const data = jsonData[run.id];
  const isError = !data || data.error;
  const rawData = isError
    ? []
    : type === "front"
      ? data.data.suspension.front_sus
      : data.data.suspension.rear_sus;
  const freq = isError
    ? 100
    : type === "front"
      ? run.front_freq || 100
      : run.rear_freq || 100;
  // Attempt to read profile ranges if the backend included the profile relation
  const profile = (run as any).profile ?? (run as any).profile_id ?? null;
  const min = profile
    ? type === "front"
      ? profile.front_min
      : profile.back_min
    : undefined;
  const max = profile
    ? type === "front"
      ? profile.front_max
      : profile.back_max
    : undefined;

  return {
    label: customLabel ?? run.title ?? `Run ${run.id}`,
    color: getSeriesColor(index),
    rawData,
    freq,
    min,
    max,
  };
}

// ---------------------- Displacement Plot ----------------------
export function DisplacementSection({
  selected,
  jsonData,
  isCompareMode,
}: ChartSectionProps) {
  if (!selected || selected.length === 0 || !selected[0]) {
    return <SectionHeader>No run selected</SectionHeader>;
  }

  const first = selected[0];
  const second = selected[1] || null;
  const firstData = jsonData[first.id];
  const secondData = second ? jsonData[second.id] : undefined;

  return (
    <section>
      <SectionHeader>Displacement Plot</SectionHeader>

      {isCompareMode ? ( // Compare mode
        <div className="grid grid-cols-1 gap-6 w-full">
          <DisplacementPlot
            title="Front Fork Comparison"
            dynamicSag={{
              front: firstData?.data?.suspension?.front_sus,
              rear: secondData?.data?.suspension?.front_sus,
            }}
            series={selected.map((run, i) =>
              getSeriesConfig(run, i, jsonData, "front")
            )}
          />
          <DisplacementPlot
            title="Rear Shock Comparison"
            series={selected.map((run, i) => getSeriesConfig(run, i, jsonData, 'rear', undefined, true))}
          />
        </div>
      ) : (
        // Single mode
        firstData &&
        !firstData.error && (
          <DisplacementPlot
            title="Suspension Displacement"
            series={[
              getSeriesConfig(first, 0, jsonData, 'front', "Front Fork", true),
              getSeriesConfig(first, 1, jsonData, 'rear', "Rear Shock", true)
            ]}
          />
        )
      )}
    </section>
  );
}

// ---------------------- Histogram Plot ----------------------
export function HistogramSection({
  selected,
  jsonData,
  isCompareMode,
}: ChartSectionProps) {
  const renderHistogram = (run: Run, index: number, type: "front" | "rear") => {
    const data = jsonData[run.id];
    if (!data || data.error) return null;

    // Data
    const rawData =
      type === "front"
        ? data.data.suspension.front_sus
        : data.data.suspension.rear_sus;
    const profile = (run as any).profile ?? null;
    const min = profile
      ? type === "front"
        ? profile.front_min
        : profile.back_min
      : undefined;
    const max = profile
      ? type === "front"
        ? profile.front_max
        : profile.back_max
      : undefined;

    // Color
    const isChart2 = isCompareMode ? index === 1 : type === "rear";
    const colorVar = isChart2 ? "chart-2" : "chart-1";

    return (
      <TravelHistogram
        key={`${type}-${run.id}`}
        title={
          isCompareMode
            ? `${type === "front" ? "Front" : "Rear"}: ${run.title}`
            : `${type === "front" ? "Front" : "Rear"} Travel`
        }
        rawData={rawData}
        min={min}
        max={max}
        fillColor={fillColor}
      />
    );
  };

  return (
    <section>
      <SectionHeader>Travel Histogram</SectionHeader>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        <div className="space-y-4">
          {selected.map((run, i) => renderHistogram(run, i, "front"))}
        </div>
        <div className="space-y-4">
          {selected.map((run, i) => renderHistogram(run, i, "rear"))}
        </div>
      </div>
    </section>
  );
}
