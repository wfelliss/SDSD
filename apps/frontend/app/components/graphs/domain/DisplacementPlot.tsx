import React, { useMemo } from "react";
import { LinePlot } from "../base/LinePlot";
import { useIsMobile } from "../../../hooks/useIsMobile";
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
  length?: number;
  dynamicSag?: boolean;
}

export interface LineHighlight {
  seriesIndex: number;
  startIndex: number;
  endIndex: number;
}

interface DisplacementPlotProps {
  title?: string;
  series: SeriesConfig[];
  height?: number;
  highlight?: LineHighlight | null;
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
  highlight,
}) => {
  const isMobile = useIsMobile();

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

  const highlightLine = useMemo<NormalizedPoint[] | null>(() => {
    if (!highlight) return null;
    const dataIndex = lineMetadata.findIndex(
      (m) => m.seriesIndex === highlight.seriesIndex && !m.isSag,
    );
    const seriesLine = dataIndex >= 0 ? chartData[dataIndex] : undefined;
    if (!seriesLine || seriesLine.length === 0) return null;

    const start = Math.max(
      0,
      Math.min(seriesLine.length - 1, highlight.startIndex),
    );
    const end = Math.max(
      0,
      Math.min(seriesLine.length - 1, highlight.endIndex),
    );
    if (start === end) return [seriesLine[start]!];

    const sliceStart = Math.min(start, end);
    const sliceEnd = Math.max(start, end) + 1;
    const segment = seriesLine.slice(sliceStart, sliceEnd);
    return segment.length > 0 ? segment : null;
  }, [highlight, chartData]);

  // No chart if every generated line is empty.
  const hasAnyData = chartData.some((line) => line.length > 0);
  if (!hasAnyData) {
    return (
      <div className="p-4 text-gray-400 italic">
        No data available for {title}
      </div>
    );
  }

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {/* Legend for primary series (sag overlays inherit the same color). */}
        <div className="flex gap-4 text-xs">
          {series.map((s, index) => (
            <div
              key={`${s.label}-${index}`}
              className="flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: getSeriesColor(index, s.color) }}
              ></div>
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
          data={highlightLine ? [...chartData, highlightLine] : chartData}
          yDomain={[0, 100]}
          height={height}
          styleForSeries={(i) => {
            const meta = lineMetadata[i];
            const strokeWidth = isMobile ? 0.75 : 1.5;
            if (highlightLine && i === chartData.length) {
              return {
                stroke: "#111827",
                strokeWidth: 3,
                strokeDasharray: "6 4",
                strokeLinecap: "round",
                opacity: 0.95,
              };
            }
            if (!meta) {
              return {
                stroke: getSeriesColor(i),
                strokeWidth,
              };
            }

            return {
              stroke: getSeriesColor(
                meta.seriesIndex,
                series[meta.seriesIndex]?.color,
              ),
              opacity: meta.isSag ? 0.35 : 1,
              strokeWidth,
            };
          }}
        />
      </div>
    </section>
  );
};
