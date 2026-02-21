import { RunJson } from "app/types/runs";
import {
  DisplacementPlot,
  SeriesConfig,
} from "app/components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "app/components/graphs/domain/TravelHistogram";
import { SectionHeader } from "app/components/ui/run-elements";
import { Profile, Run } from "@repo/database";

interface ChartSectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

// Extract profile object
function getProfileFromRun(run: Run): Profile | null {
  const profileCandidate = (run as Run & { profile?: unknown }).profile;

  if (
    !profileCandidate ||
    typeof profileCandidate !== "object" ||
    !("front_min" in profileCandidate) ||
    !("front_max" in profileCandidate) ||
    !("back_min" in profileCandidate) ||
    !("back_max" in profileCandidate)
  ) {
    return null;
  }

  return profileCandidate as Profile;
}

// Chart color mapping by index
function getSeriesColor(runIndex: number): string {
  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];
  return colors[runIndex % colors.length]!;
}

function getSeriesConfig(
  run: Run,
  index: number,
  jsonData: Record<number, RunJson>,
  type: "front" | "rear",
  customLabel?: string,
  dynamicSag?: boolean,
): SeriesConfig {
  // Resolve telemetry source and frequency
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

  // Apply rider profile min/max range
  const profile = getProfileFromRun(run);
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

  // Build unified series config for displacement rendering
  return {
    label: customLabel ?? run.title ?? `Run ${run.id}`,
    color: getSeriesColor(index),
    rawData,
    freq,
    min,
    max,
    dynamicSag,
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
  const firstData = jsonData[first.id];

  return (
    <section>
      <SectionHeader>Displacement Plot</SectionHeader>

      {isCompareMode ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          <DisplacementPlot
            title="Front Fork Comparison"
            series={selected.map((run, i) =>
              getSeriesConfig(run, i, jsonData, "front", undefined, true)
            )}
          />
          <DisplacementPlot
            title="Rear Shock Comparison"
            series={selected.map((run, i) =>
              getSeriesConfig(run, i, jsonData, "rear", undefined, true)
            )}
          />
        </div>
      ) : (
        firstData &&
        !firstData.error && (
          <DisplacementPlot
            title="Suspension Displacement"
            series={[
              getSeriesConfig(first, 0, jsonData, "front", "Front Fork", true),
              getSeriesConfig(first, 1, jsonData, "rear", "Rear Shock", true),
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

    // Extract raw suspension channel
    const rawData =
      type === "front"
        ? data.data.suspension.front_sus
        : data.data.suspension.rear_sus;
    const profile = getProfileFromRun(run);
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

    // Keep side/compare coloring stable
    const isChart2 = isCompareMode ? index === 1 : type === "rear";
    const fillColor = getSeriesColor(isChart2 ? 1 : 0);

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
