import React, { useMemo } from "react";
import { Histogram, HistogramSeries } from "../base/Histogram";
import { RawSuspensionData, processHistogramData } from "../../../lib/telemetryUtils";

interface TravelHistogramProps {
  rawData?: RawSuspensionData[];
  series?: {
    label: string;
    rawData: RawSuspensionData[];
    fillColor?: string;
    min?: number;
    max?: number;
  }[];
  title?: string;
  fillColor?: string;
  height?: number;
  min?: number;
  max?: number;
}

// Renders a histogram of displacement values
export const TravelHistogram: React.FC<TravelHistogramProps> = ({
  rawData = [],
  series,
  title = "Suspension Travel",
  fillColor = "hsl(var(--chart-1))",
  height = 200,
  min,
  max,
}) => {
  // Normalize raw displacement points into percentages for one or many series.
  const histogramSeries = useMemo<HistogramSeries[]>(() => {
    if (series && series.length > 0) {
      return series.map((seriesItem, index) => ({
        label: seriesItem.label,
        color: seriesItem.fillColor || (index === 0 ? fillColor : undefined),
        data: processHistogramData(seriesItem.rawData, seriesItem.min, seriesItem.max),
      }));
    }

    return [
      {
        label: title,
        color: fillColor,
        data: processHistogramData(rawData, min, max),
      },
    ];
  }, [series, rawData, min, max, fillColor, title]);

  // Keep layout stable
  if (!histogramSeries.some((seriesItem) => seriesItem.data.length > 0)) {
    return <div className="h-40 flex items-center justify-center text-gray-500 text-sm">No data</div>;
  }

  // Histogram rendered on a percentage domain (bars overlay in same bins).
  return (
    <div className="w-full">
      <Histogram
        series={histogramSeries}
        xDomain={[0, 100]}
        height={height}
        title={title}
      />
    </div>
  );
};