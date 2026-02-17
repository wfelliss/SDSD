import React, { useMemo } from 'react';
import { Histogram } from "../base/Histogram";
import { RawSuspensionData, processHistogramData } from "../../../lib/telemetryUtils";

interface TravelHistogramProps {
  rawData: RawSuspensionData[];
  title?: string;
  fillColor?: string;
  height?: number;
}

// Renders a histogram of suspension travel (displacement) values.
export const TravelHistogram: React.FC<TravelHistogramProps> = ({ 
  rawData,
  title = "Suspension Travel",
  fillColor = "hsl(var(--chart-1))",
  height = 160
}) => {
  
  // use telemetry utility
  const histData = useMemo(() => {
    return processHistogramData(rawData);
  }, [rawData]);

  if (histData.length === 0) {
    return <div className="h-40 flex items-center justify-center text-gray-500 text-sm">No data</div>;
  }

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