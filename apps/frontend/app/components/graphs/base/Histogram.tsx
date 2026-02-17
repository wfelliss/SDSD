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

  // Responsive resize
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
    if (!data?.length || width === 0 || !containerRef.current) return;

    const marginTop = 20, marginRight = 20, marginBottom = 40, marginLeft = 40;

    // Bin the data
    const bins = d3.bin()
      .thresholds(binCount)
      .domain(xDomain || (d3.extent(data) as [number, number]))
      (data);

    // Guard against empty or single-bin data
    if (bins.length === 0) return;
    const firstBin = bins[0]!;
    const lastBin = bins[bins.length - 1]!;

    // Create scales
    const x = d3.scaleLinear()
      .domain([firstBin.x0!, lastBin.x1!])
      .range([marginLeft, width - marginRight]);

    const maxBinLength = d3.max(bins, d => d.length) ?? 1;
    const y = d3.scaleLinear()
      .domain([0, maxBinLength])
      .range([height - marginBottom, marginTop]);

    // Clear and create SVG
    d3.select(containerRef.current).selectAll("svg").remove();
    
    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const tooltip = d3.select(tooltipRef.current);

    // Add bars
    svg.append("g")
      .selectAll("rect")
      .data(bins)
      .join("rect")
        .attr("x", d => x(d.x0!) + 1)
        .attr("width", d => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
        .attr("y", d => y(d.length))
        .attr("height", d => y(0) - y(d.length))
        .attr("rx", 2)
        .attr("fill", fillColor)
        .attr("class", "cursor-pointer transition-opacity hover:opacity-80")
        .on("mouseenter", function(_, d) {
          d3.select(this).attr("opacity", 0.8);
          const pct = ((d.length / data.length) * 100).toFixed(1);
          const range = `${(d.x0 ?? 0).toFixed(1)} - ${(d.x1 ?? 0).toFixed(1)}`;
          tooltip.style("opacity", 1)
            .html(`<div class="font-bold text-gray-900">${pct}%</div>
                   <div class="text-xs text-gray-500">Range: ${range}</div>`);
        })
        .on("mousemove", (event) => {
          const [xPos, yPos] = d3.pointer(event, containerRef.current);
          tooltip.style("left", `${xPos}px`).style("top", `${yPos - 10}px`);
        })
        .on("mouseleave", function() {
          d3.select(this).attr("opacity", 1);
          tooltip.style("opacity", 0);
        });

    // Add x-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
      .call(g => g.selectAll(".domain, .tick line").attr("class", "stroke-border"))
      .call(g => g.selectAll(".tick text").attr("class", "text-muted-foreground text-xs"));

    // Add y-axis
    const yTickFormat = maxBinLength < 10 ? d3.format("d") : d3.format("~s");
    
    svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(yTickFormat))
      .call(g => g.selectAll(".domain, .tick line").attr("class", "stroke-border"))
      .call(g => g.selectAll(".tick text").attr("class", "text-muted-foreground text-xs"));

  }, [data, width, height, fillColor, xDomain, binCount]); 

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative w-full ${className}`} ref={containerRef}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <div ref={tooltipRef} className="absolute pointer-events-none opacity-0 transition-opacity bg-white border border-gray-200 p-2 rounded shadow-lg z-50 transform -translate-x-1/2 -translate-y-full text-center whitespace-nowrap"/>
    </div>
  );
};