import React, { useMemo } from "react";
import { LinePlot } from "../base/LinePlot";
import { processLinePlotData, calculateMovingAverage, RawSuspensionData } from "../../../lib/telemetryUtils";


export interface SeriesConfig {
  label: string;
  color: string;
  rawData: RawSuspensionData[];
  freq: number;
}

interface DisplacementPlotProps {
  title?: string;
  series: SeriesConfig[];
  dynamicSag?: {
    front?: RawSuspensionData[];
    rear?: RawSuspensionData[];
  };
  width?: number;
  height?: number;
}

export const DisplacementPlot: React.FC<DisplacementPlotProps> = ({
  title = "Displacement",
  series,
  dynamicSag,
  width = 1000,
  height = 300
}) => {  
 
  // sag lines calculation
  const sagLines = useMemo(() => {
    if (!dynamicSag) return [];

    const output: any[] = [];

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

  if (chartData.length === 0 || chartData[0].length === 0) {
    return <div className="p-4 text-gray-400 italic">No data available for {title}</div>;
  }

  const masterFreq = series[0]?.freq

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {/* Legend for the active series */}
        <div className="flex gap-4 text-xs">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: s.color }}></div>
              <span className="font-medium text-gray-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <LinePlot // use base LinePlot component
          data={chartData}
          sampleFrequency={masterFreq}
          yDomain={[0, 100]}

          height={height}

          classForSeries={(i) => {
            const mainCount = series.length;
            if (i < mainCount) {
              return i % 2 === 0 ? "line-primary" : "line-secondary";
            }
            return "line-lowemphasis";
          }}
        />
      </div>
    </section>
  );
};