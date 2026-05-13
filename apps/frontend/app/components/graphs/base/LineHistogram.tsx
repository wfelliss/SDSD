import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3';
import { getSeriesColor } from '../../../lib/graphColors';

export interface LineHistogramBin {
    x0: number;
    x1: number; 
    percent: number;
}

export interface LineHistogramSeries {
  label: string;
  data: number[];
  color?: string;
}

export interface LineHistogramProps {
  data?: number[];
  series?: LineHistogramSeries[];
  height?: number;
  xDomain?: [number, number];
  className?: string;
  fillColor?: string;
  title?: string;
  binCount?: number; 
}

export const LineHistogram: React.FC<LineHistogramProps> = ({
  data = [],
  series,
  height = 500, 
  xDomain,
  className = "",
  fillColor = "hsl(var(--chart-1))",
  title,
  binCount = 20
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoveredSeriesIndex, setHoveredSeriesIndex] = useState<number | null>(null);

  // Responsive resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Main D3 rendering
  const finalSeries: LineHistogramSeries[] = useMemo(() =>
    // If series prop provided map each series item
      series && series.length > 0
        ? series
            .filter((s) => Array.isArray(s.data))
            .map((s, index) => ({
              label: s.label || `Series ${index + 1}`,
              data: s.data,
              color: getSeriesColor(index, s.color, fillColor),
            }))
        : [{ label: title || 'Distribution', data, color: fillColor }],
    [series, title, data, fillColor],
  );

  useEffect(() => {
    // Missing container guard
    if (!containerRef.current || width === 0) return;

    // Mising data guard
    const hasData = finalSeries.some((s) => s.data.length > 0);
    if (!hasData) {
      d3.select(containerRef.current).selectAll("svg").remove();
      return;
    }

    // Dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Bin each series
    const finalDomain: [number, number] = xDomain ?? [0, 100]; // our x domain is -4000 to 4000 
    const binGenerator = d3
      .bin<number, number>()
      .domain(finalDomain)
      .thresholds(binCount);
    const binsBySeries = finalSeries.map((s) => binGenerator(s.data));

    // Build line points for each series
    const linePointsBySeries = binsBySeries.map((seriesBins, seriesIndex) => {
      const totalPoints = finalSeries[seriesIndex]?.data.length ?? 0;
      return seriesBins.map((bin) => ({
        x: ((bin.x0 ?? 0) + (bin.x1 ?? 0)) / 2,
        y: totalPoints > 0 ? (bin.length / totalPoints) * 100 : 0, 
      }));
    }
    );

    // Scales
    const x = d3
      .scaleLinear()
      .domain(finalDomain)
      .range([0, innerWidth]);

    const maxPercent =
      d3.max(binsBySeries, (seriesBins, seriesIndex) => {
        const totalPoints = finalSeries[seriesIndex]?.data.length ?? 0;
        if (totalPoints === 0) return 0;
        return d3.max(seriesBins, (bin) => (bin.length / totalPoints) * 100) ?? 0;
      }) ?? 0;

    const yMax = Math.max(1, maxPercent * 1.05);
    const y = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    // SVG setup
    const svg = d3
      .select(containerRef.current)
      .selectAll<SVGSVGElement, null>("svg")
      .data([null])
      .join("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "overflow-hidden");

    const g = svg
      .selectAll<SVGGElement, null>("g.plot")
      .data([null])
      .join("g")
      .attr("class", "plot")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select(tooltipRef.current);
    tooltip.style("opacity", 0);

    type RenderSeries = {                                                                                                                                                                    
      seriesIndex: number;
      color: string;                                                                                                                                                                         
      label: string;
      points: { x: number; y: number }[];
    };

    const renderSeries: RenderSeries[] = linePointsBySeries.map((points, seriesIndex) => ({                                                                                                  
      seriesIndex,                                                                                                                                                                           
      color: finalSeries[seriesIndex]?.color ?? fillColor,
      label: finalSeries[seriesIndex]?.label ?? `Series ${seriesIndex + 1}`,                                                                                                                 
      points,                                                                                                                                                                                
    }));

    // Draw axis
    g.selectAll<SVGGElement, null>("g.x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(innerWidth / 80))).tickSizeOuter(0))
      .call((axisGroup) => axisGroup.selectAll(".domain, .tick line").attr("class", "stroke-border"))
      .call((axisGroup) => axisGroup.selectAll(".tick text").attr("class", "text-muted-foreground text-xs"));

    const yTickFormat = d3.format(".0f");
    g.selectAll<SVGGElement, null>("g.y-axis")
      .data([null])                                                                                                                                                                          
      .join("g")    
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat((value) => `${yTickFormat(Number(value))}%`))
      .call((axisGroup) => axisGroup.selectAll(".domain, .tick line").attr("class", "stroke-border"))
      .call((axisGroup) => axisGroup.selectAll(".tick text").attr("class", "text-muted-foreground text-xs"));

    g.selectAll("line.zero-line")
      .data([null])
      .join("line")
      .attr("class", "zero-line")                                                                                                                                                            
      .attr("x1", x(0)).attr("x2", x(0))
      .attr("y1", 0).attr("y2", innerHeight)                                                                                                                                                 
      .attr("stroke", "hsl(var(--border))")                                                                                                                                                  
      .attr("stroke-dasharray", "4,4");

    // Draw lines
    const lineGenerator = d3.line<{ x: number; y: number }>()                                                                                                                                
      .x((point) => x(point.x))                                                                                                                                
      .y((point) => y(point.y))                                                                                                                                   
      .curve(d3.curveMonotoneX);

    g.selectAll<SVGPathElement, RenderSeries>("path.series-line") 
      .data(renderSeries, (s) => s.seriesIndex)                                                                                                                                                
      .join("path") 
      .attr("d", (s) => lineGenerator(s.points))
      .attr("fill", "none")
      .attr("stroke", (s) => s.color)
      .attr("stroke-width", 2)
      .attr("opacity", (d) => (hoveredSeriesIndex === null || hoveredSeriesIndex === d.seriesIndex ? 1 : 0.3));

    // Tooltip setup
    // (no tooltip as of yet)
    
  } , [finalSeries, width, height, xDomain, binCount]); // add hoveredSeriesIndex back for tooltip

  // JSX return
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative w-full ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
        {finalSeries.length > 1 && (
          <div className="flex gap-4 text-xs">
            {finalSeries.map((s, index) => (
              <div
                key={`${s.label}-${index}`}
                className="flex items-center gap-2 cursor-pointer"
                onMouseEnter={() => setHoveredSeriesIndex(index)}
                onMouseLeave={() => setHoveredSeriesIndex(null)}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: s.color }}></div>
                <span className="font-medium text-gray-600">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div ref={tooltipRef} className="absolute pointer-events-none opacity-0 transition-opacity bg-white border border-gray-200 p-2 rounded shadow-lg z-50 transform -translate-x-1/2 -translate-y-full text-center whitespace-nowrap"/>
    </div>
  );
};
