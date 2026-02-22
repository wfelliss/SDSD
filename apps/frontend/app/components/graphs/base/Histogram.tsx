import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface HistogramBin {
  x0: number;
  x1: number;
  percent: number;
}

export interface HistogramProps {
  data: number[];
  height?: number;
  xDomain?: [number, number];
  className?: string;
  fillColor?: string;
  title?: string;
  binCount?: number;
}

export const Histogram: React.FC<HistogramProps> = ({ 
  data, 
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
  useEffect(() => {
    if (!containerRef.current || width === 0) return;

    if (!data?.length) {
      d3.select(containerRef.current).selectAll("svg").remove();
      return;
    }

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Bin source data into histogram buckets
    const finalDomain: [number, number] = xDomain ?? [0, 100];
    const bins = d3
      .bin<number, number>()
      .domain(finalDomain)
      .thresholds(binCount)(data);

    if (bins.length === 0) return;

    const firstBin = bins[0];
    const lastBin = bins[bins.length - 1];
    if (!firstBin || !lastBin || firstBin.x0 == null || lastBin.x1 == null) return;

    // Build scales for bars and axes
    const x = d3
      .scaleLinear()
      .domain([firstBin.x0, lastBin.x1])
      .range([0, innerWidth]);

    const maxBinLength = d3.max(bins, (bin) => bin.length) ?? 1;
    const y = d3
      .scaleLinear()
      .domain([0, maxBinLength])
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

    // Draw bars + interactive tooltip
    g.selectAll<SVGRectElement, d3.Bin<number, number>>("rect")
      .data(bins)
      .join("rect")
      .attr("x", (bin) => x(bin.x0 ?? 0) + 1)
      .attr("width", (bin) => Math.max(0, x(bin.x1 ?? 0) - x(bin.x0 ?? 0) - 1))
      .attr("y", (bin) => y(bin.length))
      .attr("height", (bin) => y(0) - y(bin.length))
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("fill", fillColor)
      .attr("class", "cursor-pointer transition-opacity hover:opacity-80")
      .on("mouseenter", function (event: MouseEvent, bin) {
        d3.select(this).attr("opacity", 0.8);
        const pct = ((bin.length / data.length) * 100).toFixed(1);
        const range = `${(bin.x0 ?? 0).toFixed(1)} - ${(bin.x1 ?? 0).toFixed(1)}`;
        tooltip
          .style("opacity", 1)
          .html(`<div class="font-bold text-gray-900">${pct}%</div><div class="text-xs text-gray-500">Range: ${range}</div>`);

        const [xPos, yPos] = d3.pointer(event, containerRef.current);
        tooltip.style("left", `${xPos}px`).style("top", `${yPos - 10}px`);
      })
      .on("mousemove", (event: MouseEvent) => {
        const [xPos, yPos] = d3.pointer(event, containerRef.current);
        tooltip.style("left", `${xPos}px`).style("top", `${yPos - 10}px`);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1);
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

    const yTickFormat = maxBinLength < 10 ? d3.format("d") : d3.format("~s");
    g.selectAll<SVGGElement, null>("g.y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat((value) => yTickFormat(Number(value))))
      .call((axisGroup) => axisGroup.selectAll(".domain, .tick line").attr("class", "stroke-border"))
      .call((axisGroup) => axisGroup.selectAll(".tick text").attr("class", "text-muted-foreground text-xs"));

  }, [data, width, height, fillColor, xDomain, binCount]); 

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative w-full ${className}`} ref={containerRef}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <div ref={tooltipRef} className="absolute pointer-events-none opacity-0 transition-opacity bg-white border border-gray-200 p-2 rounded shadow-lg z-50 transform -translate-x-1/2 -translate-y-full text-center whitespace-nowrap"/>
    </div>
  );
};