import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface HistogramBin {
  x0: number;
  x1: number;
  percent: number;
}

export interface HistogramSeries {
  label: string;
  data: number[];
  color?: string;
}

export interface HistogramProps {
  data?: number[];
  series?: HistogramSeries[];
  height?: number;
  xDomain?: [number, number];
  className?: string;
  fillColor?: string;
  title?: string;
  binCount?: number;
}

export const Histogram: React.FC<HistogramProps> = ({ 
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
  const finalSeries: HistogramSeries[] =
    series && series.length > 0
      ? series
          .filter((s) => Array.isArray(s.data))
          .map((s, index) => ({
            label: s.label || `Series ${index + 1}`,
            data: s.data,
            color: s.color,
          }))
      : [{ label: title || 'Distribution', data, color: fillColor }];

  useEffect(() => {
    if (!containerRef.current || width === 0) return;

    const hasData = finalSeries.some((s) => s.data.length > 0);
    if (!hasData) {
      d3.select(containerRef.current).selectAll("svg").remove();
      return;
    }

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Bin source data into histogram buckets
    const finalDomain: [number, number] = xDomain ?? [0, 100];
    const binGenerator = d3
      .bin<number, number>()
      .domain(finalDomain)
      .thresholds(binCount);
    const binsBySeries = finalSeries.map((s) => binGenerator(s.data));

    if (binsBySeries.length === 0 || binsBySeries[0]?.length === 0) return;

    const firstSeriesBins = binsBySeries[0];
    if (!firstSeriesBins) return;
    const firstBin = firstSeriesBins[0];
    const lastBin = firstSeriesBins[firstSeriesBins.length - 1];
    if (!firstBin || !lastBin || firstBin.x0 == null || lastBin.x1 == null) return;

    // Build scales for bars and axes
    const x = d3
      .scaleLinear()
      .domain([firstBin.x0, lastBin.x1])
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

    type RenderBar = {
      seriesIndex: number;
      binIndex: number;
      x0: number;
      x1: number;
      count: number;
      percent: number;
      total: number;
      color: string;
      label: string;
    };

    const seriesCount = Math.max(1, finalSeries.length);
    const bars: RenderBar[] = binsBySeries.flatMap((seriesBins, seriesIndex) => {
      const seriesConfig = finalSeries[seriesIndex];
      const totalPoints = seriesConfig?.data.length ?? 0;
      const color = seriesConfig?.color || fillColor;
      const label = seriesConfig?.label || `Series ${seriesIndex + 1}`;

      return seriesBins.map((bin, binIndex) => {
        const x0 = bin.x0 ?? 0;
        const x1 = bin.x1 ?? x0;
        const percent = totalPoints > 0 ? (bin.length / totalPoints) * 100 : 0;

        return {
          seriesIndex,
          binIndex,
          x0,
          x1,
          count: bin.length,
          percent,
          total: totalPoints,
          color,
          label,
        };
      });
    }).sort((a, b) => {
      // Group by bin, then sort smaller percentages last (rendered on top)
      if (a.binIndex !== b.binIndex) return a.binIndex - b.binIndex;
      return b.percent - a.percent;
    });

    // Draw overlaid bars (all in same bin) + interactive tooltip
    g.selectAll<SVGRectElement, RenderBar>("rect")
      .data(bars, (bar) => `${bar.seriesIndex}-${bar.binIndex}`)
      .join("rect")
      .attr("x", (bar) => x(bar.x0) + 1)
      .attr("width", (bar) => Math.max(0, x(bar.x1) - x(bar.x0) - 1))
      .attr("y", (bar) => y(bar.percent))
      .attr("height", (bar) => y(0) - y(bar.percent))
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("fill", (bar) => bar.color)
      .attr("stroke", "hsl(var(--card))")
      .attr("stroke-width", 0.5)
      .attr("opacity", (bar) => {
        // If hovering over legend, dim non-hovered series
        if (hoveredSeriesIndex !== null && bar.seriesIndex !== hoveredSeriesIndex) {
          return 0.2;
        }
        
        // Find all bars in same bin, apply lower opacity to smallest
        const barsInBin = bars.filter((b) => b.binIndex === bar.binIndex);
        const minPercent = Math.min(...barsInBin.map((b) => b.percent));
        return bar.percent === minPercent ? 0.7 : 1;
      })
      .attr("class", "cursor-pointer")
      .on("mouseenter", function (event: MouseEvent, bar) {
        d3.select(this).style("filter", "brightness(1.1)");
        
        const barsInBin = bars.filter((b) => b.binIndex === bar.binIndex);
        const range = `${bar.x0.toFixed(1)} - ${bar.x1.toFixed(1)}`;
        const tooltipLines = barsInBin
          .map((b) => `<div class="text-xs text-gray-600">${b.label}: ${b.percent.toFixed(1)}%</div>`)
          .join("");
        
        tooltip
          .style("opacity", 1)
          .html(`<div class="text-xs text-gray-500"></div>${tooltipLines}`);

        const [xPos, yPos] = d3.pointer(event, containerRef.current);
        tooltip.style("left", `${xPos}px`).style("top", `${yPos - 10}px`);
      })
      .on("mousemove", (event: MouseEvent) => {
        const [xPos, yPos] = d3.pointer(event, containerRef.current);
        tooltip.style("left", `${xPos}px`).style("top", `${yPos - 10}px`);
      })
      .on("mouseleave", function () {
        d3.select(this).style("filter", null);
        tooltip.style("opacity", 0);
      });

    // Draw axes
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

  }, [finalSeries, data, series, width, height, fillColor, title, xDomain, binCount, hoveredSeriesIndex]); 

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