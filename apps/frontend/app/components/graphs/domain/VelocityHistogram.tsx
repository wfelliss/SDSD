import React, { useMemo } from "react";
import {
    LineHistogram,
    LineHistogramSeries } from "../base/LineHistogram";
import { RawSuspensionData } from '../../../lib/telemetryUtils';
import {
    processCompressions,
    filterLowActivityOutliers,
} from "app/lib/run-analysis";
import { getSeriesColor } from "app/lib/graphColors";

interface VelocityHistogramSeries {
  label: string;
  rawData: RawSuspensionData[];
  freq: number;
  fillColor?: string;
  min?: number;
  max?: number;
  length?: number;
}

interface VelocityHistogramProps {
  series: VelocityHistogramSeries[];
  title?: string;
  fillColor?: string;
  height?: number;
}

// Builds the same stroke-velocity points (mm/s) the speed scatter plots use,
// so the histogram is a distribution view of identical, identically-filtered data.
function buildFilteredVelocities(seriesItem: VelocityHistogramSeries): number[] {
  const length = seriesItem.length ?? 220;
  const min = seriesItem.min ?? 0;
  const max = seriesItem.max ?? 4096;

  const activities = processCompressions(
    seriesItem.rawData,
    seriesItem.freq,
    length,
    min,
    max,
  );

  // Filter compression and rebound subsets separately, exactly as the scatter
  // does, then combine so the histogram bins precisely the scatter's points.
  const kept = [
    ...filterLowActivityOutliers(
      activities.filter((a) => a.type === "compression"),
      length,
    ),
    ...filterLowActivityOutliers(
      activities.filter((a) => a.type === "rebound"),
      length,
    ),
  ];

  return kept.map((a) => a.velocity);
}

// Renders a histogram of suspension stroke speeds (mm/s)
export const VelocityHistogram: React.FC<VelocityHistogramProps> = ({
  series,
  title = "Suspension Speed",
  fillColor = "hsl(var(--chart-1))",
  height = 200,
}) => {
  const histogramSeries = useMemo<LineHistogramSeries[]>(
    () =>
      series.map((seriesItem, index) => ({
        label: seriesItem.label,
        color: getSeriesColor(index, seriesItem.fillColor, fillColor),
        data: buildFilteredVelocities(seriesItem),
      })),
    [series, fillColor],
  );

  // Auto-scale the x-axis to the actual mm/s velocity range (symmetric about 0).
  const xDomain = useMemo<[number, number]>(() => {
    let maxAbs = 0;
    for (const s of histogramSeries) {
      for (const v of s.data) {
        const abs = Math.abs(v);
        if (abs > maxAbs) maxAbs = abs;
      }
    }
    const bound = maxAbs > 0 ? maxAbs * 1.05 : 100;
    return [-bound, bound];
  }, [histogramSeries]);

  // Keep layout stable
  if (!histogramSeries.some((seriesItem) => seriesItem.data.length > 0)) {
    return <div className="h-40 flex items-center justify-center text-gray-500 text-sm">No data</div>;
  }

  return (
    <div className="w-full">
      <LineHistogram
        series={histogramSeries}
        xDomain={xDomain}
        height={height}
        title={title}
        binCount={50}
      />
    </div>
  );
};
