import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { Histogram, HistogramBin } from "../base/Histogram";
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
  
  // Normalize raw data and bin it
  const bins = useMemo(() => {
    const normalized = processHistogramData(rawData);
    if (normalized.length === 0) return [];
    
    const binGenerator = d3.bin()
      .domain([0, 100])
      .thresholds(20);
    
    const binnedData = binGenerator(normalized);
    const totalCount = normalized.length;
    
    return binnedData.map(d => ({
      x0: d.x0 ?? 0,
      x1: d.x1 ?? 0,
      percent: Math.round(d.length / totalCount * 100)
    })) as HistogramBin[];
  }, [rawData]);

  if (bins.length === 0) {
    return <div className="h-40 flex items-center justify-center text-r text-sm">No data</div>;
  }

  return (
    <div className="w-full">
      <Histogram
        bins={bins}
        xDomain={[0, 100]}
        height={height} 
        colorClass={colorClass} 
        hoverColorClass={hoverColorClass} 
        title={title}        
      />
    </div>
  );
};