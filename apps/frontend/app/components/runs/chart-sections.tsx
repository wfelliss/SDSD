import { RunJson } from "app/types/runs";
import {
  DisplacementPlot,
  SeriesConfig,
  LineHighlight,
} from "app/components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "app/components/graphs/domain/TravelHistogram";
import { ReboundCompressionPlot } from "app/components/graphs/domain/ReboundCompressionPlot";
import { SectionHeader } from "app/components/ui/run-elements";
import { Run } from "@repo/database";
import { getSeriesColor } from "app/lib/graphColors";
import {
  getProfileFromRun,
  RawSuspensionData,
  resolveTrimBounds,
  trimRawDataByBounds,
} from "app/lib/telemetryUtils";
import { useState } from "react";

interface ChartSectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

function toRawSuspensionArray(value: unknown): RawSuspensionData[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as RawSuspensionData[];
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
    : toRawSuspensionArray(
        type === "front"
          ? data.data.suspension.front_sus
          : data.data.suspension.rear_sus,
      );
  const bounds = resolveTrimBounds(run, rawData.length);
  const offset = bounds?.lowerBoundIdx ?? 0;
  const trimmedRawData = trimRawDataByBounds(run, rawData);
  const freq = isError
    ? 100
    : type === "front"
      ? run.front_freq || 100
      : run.rear_freq || 100;

  // Apply rider profile min/max range and suspension travel
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
  const length = profile
    ? type === "front"
      ? profile.front_travel
      : profile.back_travel
    : undefined;

  // Build unified series config for displacement rendering
  return {
    label: customLabel ?? run.title ?? `Run ${run.id}`,
    color: getSeriesColor(index),
    rawData: trimmedRawData,
    freq,
    min,
    max,
    length,
    dynamicSag,
    indexOffset: offset,
  };
}

// ---------------------- Displacement Plot ----------------------
export function DisplacementSection({
  selected,
  jsonData,
  isCompareMode,
}: ChartSectionProps) {
  const [highlight, setHighlight] = useState<LineHighlight | null>(null);

  if (!selected || selected.length === 0 || !selected[0]) {
    return <SectionHeader>No run selected</SectionHeader>;
  }

  const first = selected[0];
  const firstData = jsonData[first.id];

  return (
    <section>
      <SectionHeader>Displacement & Velocity</SectionHeader>

      {isCompareMode ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          <DisplacementPlot
            title="Front Fork Comparison"
            series={selected.map((run, i) =>
              getSeriesConfig(run, i, jsonData, "front", undefined, true),
            )}
            highlight={highlight}
          />
          <DisplacementPlot
            title="Rear Shock Comparison"
            series={selected.map((run, i) =>
              getSeriesConfig(run, i, jsonData, "rear", undefined, true),
            )}
            highlight={highlight}
          />

          <ReboundCompressionPlot
            title="Front Suspension"
            series={selected.map((run, i) =>
              getSeriesConfig(run, i, jsonData, "front", undefined, true),
            )}
            speedRegion={{ low: 50, high: 150 }}
            onPointSelect={({ seriesIndex, startIndex, endIndex }) => {
              setHighlight({ seriesIndex, startIndex, endIndex });
            }}
          />

          <ReboundCompressionPlot
            title="Rear Suspension"
            series={selected.map((run, i) =>
              getSeriesConfig(run, i, jsonData, "rear", undefined, true),
            )}
            speedRegion={{ low: 50, high: 150 }}
            onPointSelect={({ seriesIndex, startIndex, endIndex }) => {
              setHighlight({ seriesIndex, startIndex, endIndex });
            }}
          />
        </div>
      ) : (
        firstData &&
        !firstData.error && (
          <div className="grid grid-cols-1 gap-6">
            <DisplacementPlot
              title="Suspension Displacement"
              series={[
                getSeriesConfig(
                  first,
                  0,
                  jsonData,
                  "front",
                  "Front Fork",
                  true,
                ),
                getSeriesConfig(first, 1, jsonData, "rear", "Rear Shock", true),
              ]}
              highlight={highlight}
            />

            <ReboundCompressionPlot
              title="Front Suspension"
              series={[
                getSeriesConfig(
                  first,
                  0,
                  jsonData,
                  "front",
                  "Front Fork",
                ),
              ]}
              speedRegion={{ low: 50, high: 150 }}
              onPointSelect={({ seriesIndex, startIndex, endIndex }) => {
                setHighlight({ seriesIndex, startIndex, endIndex });
              }}
            />

            <ReboundCompressionPlot
              title="Rear Suspension"
              series={[
                getSeriesConfig(
                  first,
                  1,
                  jsonData,
                  "rear",
                  "Rear Shock",
                ),
              ]}
              speedRegion={{ low: 50, high: 150 }}
              onPointSelect={({ startIndex, endIndex }) => {
                setHighlight({ seriesIndex: 1, startIndex, endIndex });
              }}
            />
          </div>
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
  const buildSeries = (type: "front" | "rear") => {
    return selected
      .map((run, runIndex) => {
        const data = jsonData[run.id];
        if (!data || data.error) {
          return null;
        }

        const profile = getProfileFromRun(run);
        const min = type === "front" ? profile?.front_min : profile?.back_min;
        const max = type === "front" ? profile?.front_max : profile?.back_max;

        return {
          label: run.title ?? `Run ${run.id}`,
          rawData: trimRawDataByBounds(
            run,
            toRawSuspensionArray(
              type === "front"
                ? data.data.suspension.front_sus
                : data.data.suspension.rear_sus,
            ),
          ),
          fillColor: getSeriesColor(runIndex),
          min,
          max,
        };
      })
      .filter((seriesItem): seriesItem is NonNullable<typeof seriesItem> =>
        Boolean(seriesItem),
      );
  };

  const frontSeries = buildSeries("front");
  const rearSeries = buildSeries("rear");

  if (selected.length === 1 && !isCompareMode) {
    const singleRun = selected[0];
    if (!singleRun) {
      return null;
    }

    const data = jsonData[singleRun.id];
    if (!data || data.error) {
      return (
        <section>
          <SectionHeader>Travel Histogram</SectionHeader>
          <div className="p-4 text-gray-400 italic">
            No histogram data available
          </div>
        </section>
      );
    }

    return (
      <section>
        <SectionHeader>Travel Histogram</SectionHeader>
        <div className="w-full md:w-1/2">
          <TravelHistogram
            title="Suspension Travel"
            series={[
              {
                label: "Front Fork",
                rawData: frontSeries[0]?.rawData ?? [],
                fillColor: getSeriesColor(0),
                min: frontSeries[0]?.min,
                max: frontSeries[0]?.max,
              },
              {
                label: "Rear Shock",
                rawData: rearSeries[0]?.rawData ?? [],
                fillColor: getSeriesColor(1),
                min: rearSeries[0]?.min,
                max: rearSeries[0]?.max,
              },
            ]}
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader>Travel Histogram</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <TravelHistogram
          title="Front Fork Comparison"
          series={frontSeries}
        />
        <TravelHistogram
          title="Rear Shock Comparison"
          series={rearSeries}
        />
      </div>
    </section>
  );
}