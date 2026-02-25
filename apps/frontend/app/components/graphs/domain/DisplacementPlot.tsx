import React, { useMemo } from "react";
import { LinePlot } from "../base/LinePlot";
import {
  calculateMovingAverage,
  processLinePlotData,
  RawSuspensionData,
  NormalizedPoint,
} from "../../../lib/telemetryUtils";
import { getSeriesColor } from "../../../lib/graphColors";

export interface SeriesConfig {
  label: string;
  color?: string;
  rawData: RawSuspensionData[];
  freq: number;
  min?: number;
  max?: number;
  dynamicSag?: boolean;
}

interface DisplacementPlotProps {
  title?: string;
  series: SeriesConfig[];
  height?: number;
}

interface LineMetadata {
  seriesIndex: number;
  isSag: boolean;
}

// DisplacementPlot renders suspension displacement
export const DisplacementPlot: React.FC<DisplacementPlotProps> = ({
  title = "Displacement",
  series,
  height = 300,
}) => {
  // Build plot lines for each series and optional smoothed sag overlays.
  const { chartData, lineMetadata } = useMemo(() => {
    const lines: NormalizedPoint[][] = [];
    const metadata: LineMetadata[] = [];

    series.forEach((seriesItem, seriesIndex) => {
      const processed = processLinePlotData(
        seriesItem.rawData,
        seriesItem.freq,
        seriesItem.min,
        seriesItem.max,
      );

      lines.push(processed);
      metadata.push({ seriesIndex, isSag: false });

      if (seriesItem.dynamicSag) {
        const smoothed = calculateMovingAverage(processed, seriesItem.freq);
        if (smoothed.length > 0) {
          lines.push(smoothed);
          metadata.push({ seriesIndex, isSag: true });
        }
      }
    });

    return { chartData: lines, lineMetadata: metadata };
  }, [series]);

  // No chart if every generated line is empty.
  const hasAnyData = chartData.some((line) => line.length > 0);
  if (!hasAnyData) {
    return <div className="p-4 text-gray-400 italic">No data available for {title}</div>;
  }

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {/* Legend for primary series (sag overlays inherit the same color). */}
        <div className="flex gap-4 text-xs">
          {series.map((s, index) => (
            <div key={`${s.label}-${index}`} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: getSeriesColor(index, s.color) }}></div>
              <span className="font-medium text-gray-600">
                {s.label}
                {s.dynamicSag ? " (sag)" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <LinePlot
          data={chartData}
          yDomain={[0, 100]}
          height={height}
          styleForSeries={(i) => {
            const meta = lineMetadata[i];
            if (!meta) {
              return {
                stroke: getSeriesColor(i),
              };
            }

            return {
              stroke: getSeriesColor(meta.seriesIndex, series[meta.seriesIndex]?.color),
              opacity: meta.isSag ? 0.35 : 1,
            };
          }}
        />
      </div>
    </section>
  );
};