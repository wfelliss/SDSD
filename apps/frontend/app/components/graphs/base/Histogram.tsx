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

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // --- INITIALIZATION ---
    if (!d3Ref.current.initialized) {
        d3.select(containerRef.current).selectAll("svg").remove();

        const svg = d3.select(containerRef.current)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("class", "overflow-visible");
        
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xAxisGroup = g.append("g").attr("class", "x-axis");
        const yAxisGroup = g.append("g").attr("class", "y-axis");
        
        d3Ref.current = { 
            initialized: true, 
            svg, 
            g, 
            xAxisGroup, 
            yAxisGroup,
            x: d3.scaleLinear(), 
            y: d3.scaleLinear()
        };
    }

    // --- UPDATES ---
    const { svg, g, xAxisGroup, yAxisGroup, x, y } = d3Ref.current;
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