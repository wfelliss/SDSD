import React, { useMemo } from "react";
import { LinePlot } from "../base/LinePlot";
import { processLinePlotData, calculateMovingAverage, RawSuspensionData, NormalizedPoint } from "../../../lib/telemetryUtils";

export interface SeriesConfig {
  label: string;
  color: string;
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

// Line metadata (include options to toggle eventually)
interface LineMetadata {
  seriesIndex: number;
  isSag: boolean;
}

// DisplacementPlot renders suspension displacement
export const DisplacementPlot: React.FC<DisplacementPlotProps> = ({
  title = "Displacement",
  series,
  height = 300
}) => {  
  // Chart data calculation - processes each series
  const { chartData, lineMetadata } = useMemo(() => {
    const lines: NormalizedPoint[][] = [];
    const metadata: LineMetadata[] = [];

    if (dynamicSag.front && series[0]) {
      const clean = processLinePlotData(dynamicSag.front, series[0].freq);
      output.push(calculateMovingAverage(clean, series[0].freq));
    }

    if (dynamicSag.rear && series[1]) {
      const clean = processLinePlotData(dynamicSag.rear, series[1].freq);
      output.push(calculateMovingAverage(clean, series[1].freq));
    }

    return output;
  }, [dynamicSag, series]);

  // chart data calculation
  const chartData = useMemo(() => {
    const mainLines = series.map(s => processLinePlotData(s.rawData, s.freq));
    return [...mainLines, ...sagLines];
  }, [series, sagLines]);

  if (chartData.length === 0 || chartData[0]?.length === 0) {
    return <div className="p-4 text-gray-400 italic">No data available for {title}</div>;
  } 

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {/* Legend for the active series */}
        <div className="flex gap-4 text-xs">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: s.color }}></div>
              <span className="font-medium text-gray-600">{s.label}{s.dynamicSag ? ' (sag)' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <LinePlot 
          data={chartData}
          yDomain={[0, 100]}
          height={height}
          classForSeries={(i) => {
            const meta = lineMetadata[i]!;
            if (meta.isSag) {
              return "line-lowemphasis";
            }
            return meta.seriesIndex % 2 === 0 ? "line-primary" : "line-secondary";
          }}
        />
      </div>
    </section>
  );
};