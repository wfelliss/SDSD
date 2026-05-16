import React, { useMemo } from "react";
import { 
    LineHistogram, 
    LineHistogramSeries } from "../base/LineHistogram";
import {
    buildVelocitySamples, 
    RawSuspensionData} from '../../../lib/telemetryUtils';
import { getSeriesColor } from "app/lib/graphColors";

interface VelocityHistogramProps {
  rawData?: RawSuspensionData[];
  freq?: number;
  series?: {
    label: string;
    rawData: RawSuspensionData[];
    freq: number;
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

// Renders a histogram of velocity values
export const VelocityHistogram: React.FC<VelocityHistogramProps> = ({
  rawData = [],
  freq = 100,
  series,
  title = "Suspension Velocity",
  fillColor = "hsl(var(--chart-1))",
  height = 200,
  min,
  max,
}) => {
    // buildVelocitySamples on rawData to get velocity samples
    const histogramSeries = useMemo<LineHistogramSeries[]>(() => {
        if (series && series.length > 0) {
            return series.map((seriesItem, index) => ({
                label: seriesItem.label,
                color: getSeriesColor(index, seriesItem.fillColor, fillColor),
                data: buildVelocitySamples(seriesItem.rawData, seriesItem.freq, seriesItem.min, seriesItem.max).map(s => s.velocity),
            }));
        }
        
        return [
            {
                label: title,
                color: fillColor,
                data: buildVelocitySamples(rawData, freq, min, max).map(s => s.velocity),
            },
        ];
    }, [series, rawData, freq, min, max, fillColor, title]);

    // Keep layout stable
    if (!histogramSeries.some((seriesItem) => seriesItem.data.length > 0)) {
        return <div className="h-40 flex items-center justify-center text-gray-500 text-sm">No data</div>;
    }

    return (
    <div className="w-full">
        <LineHistogram
        series={histogramSeries}
        xDomain={[-4000,4000]} 
        height={height}
        title={title}
        binCount={50}
        />
    </div>
    );
};
