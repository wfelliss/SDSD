import React, { useMemo } from 'react';
import { Histogram } from "../base/Histogram";
import { processHistogramData } from "../../../lib/telemetryUtils";

interface TravelHistogramProps {
  rawData: any[];
  title?: string;
  colorClass?: string;
  hoverColorClass?: string;
  height?: number;
}

export const TravelHistogram: React.FC<TravelHistogramProps> = ({ 
  rawData,
  title = "Suspension Travel",
  colorClass = "fill-blue-500",
  hoverColorClass = "fill-blue-700",
  height = 160
}) => {
  
  // use telemetry utility
  const histData = useMemo(() => {
    return processHistogramData(rawData);
  }, [rawData]);

  if (histData.length === 0) {
    return <div className="h-40 flex items-center justify-center text-r text-sm">No data</div>;
  }

  return (
    <div className="w-full">
      <Histogram // use base Histogram component
        data={histData} 
        xDomain={[0, 100]}
        height={height} 
        colorClass={colorClass} 
        hoverColorClass={hoverColorClass} 
        title={title}        
      />
    </div>
  );
};