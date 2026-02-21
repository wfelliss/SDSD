import React, { useMemo } from "react";
import { Histogram } from "../base/Histogram";
import { RawSuspensionData, processHistogramData } from "../../../lib/telemetryUtils";

interface TravelHistogramProps {
  rawData: RawSuspensionData[];
  title?: string;
  fillColor?: string;
  height?: number;
  min?: number;
  max?: number;
}

// Renders a histogram of displacement values
export const TravelHistogram: React.FC<TravelHistogramProps> = ({
  rawData,
  title = "Suspension Travel",
  fillColor = "hsl(var(--chart-1))",
  height = 160,
  min,
  max,
}) => {
  // Normalize raw displacement points into percentages
  const histData = useMemo(() => {
    return processHistogramData(rawData, min, max);
  }, [rawData, min, max]);

  // Keep layout stable
  if (histData.length === 0) {
    return <div className="h-40 flex items-center justify-center text-gray-500 text-sm">No data</div>;
  }

  // Histogram rendered on a percentage domain.
  return (
    <div className="w-full">
      <Histogram
        data={histData}
        xDomain={[0, 100]}
        height={height}
        fillColor={fillColor}
        title={title}
      />
    </div>
  );
};