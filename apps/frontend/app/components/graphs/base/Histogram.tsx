import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface HistogramProps {
  data: number[];
  height?: number;
  xDomain?: [number, number];
  className?: string;
  colorClass?: string;
  hoverColorClass?: string;
  title?: string;
}

export const Histogram: React.FC<HistogramProps> = ({ 
  data, 
  height = 500, 
  xDomain,
  className = "",
  colorClass = "fill-blue-500", 
  hoverColorClass = "fill-blue-600",
  title
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Persist D3 selections and scales to prevent recreation on every render
  const d3Ref = useRef<any>({ initialized: false });

  // 1. Responsive Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      setWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Main D3 Logic
  useEffect(() => {
    if (!data || width === 0 || !containerRef.current) return;

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

    // Update dimensions
    svg.attr("width", width).attr("height", height);

    // Determine Domain
    const finalDomain = xDomain || (d3.extent(data) as [number, number]);
    const dMin = finalDomain[0] ?? 0;
    const dMax = finalDomain[1] ?? 100; 

    x.range([0, innerWidth]).domain([dMin, dMax]);
    
    if (!xDomain) x.nice();

    // Calculate Bins
    const histogramGenerator = d3.bin()
        .domain(x.domain() as [number, number])
        .thresholds(x.ticks(20)); // 20 bins for 5% range

    const bins = histogramGenerator(data);

    // Update Y Scale 
    const yMax = d3.max(bins, d => d.length) || 0;
    y.range([innerHeight, 0]).domain([0, yMax]);

    // Draw X Axis
    xAxisGroup
        .attr("transform", `translate(0,${innerHeight})`)
        .transition().duration(500)
        .call(d3.axisBottom(x));
    
    // Draw Y Axis
    const yTickFormat = yMax < 10 ? d3.format("d") : d3.format("~s");
    
    yAxisGroup
        .transition().duration(500)
        .call(d3.axisLeft(y).ticks(5).tickFormat(yTickFormat));

    // Style Axes
    svg.selectAll(".domain").attr("class", "stroke-border");
    svg.selectAll(".tick line").attr("class", "stroke-border");
    svg.selectAll(".tick text").attr("class", "text-muted-foreground text-xs");
    yAxisGroup.select(".domain").remove(); 

    // Render Bars
    g.selectAll("rect")
      .data(bins)
      .join(
        (enter: any) => enter.append("rect")
            .attr("x", (d: any) => x(d.x0!) + 1)
            .attr("width", (d: any) => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
            .attr("y", innerHeight)
            .attr("height", 0)
            .attr("rx", 2)
            .attr("ry", 2), 
        (update: any) => update,
        (exit: any) => exit.transition().duration(500).attr("y", innerHeight).attr("height", 0).remove()
      )
      .attr("class", `bar-rect cursor-pointer transition-colors duration-200 ${colorClass}`)
      .on("mouseenter", function(event: any, d: any) {
          d3.select(this).attr("class", `bar-rect cursor-pointer ${hoverColorClass}`);
          
          tooltip.style("opacity", 1)
                .html(`
                  <div class="font-bold text-gray-900">${d.length}</div>
                  <div class="text-xs text-gray-500">Range: ${d.x0} - ${d.x1}</div>
                `);
      })
      .on("mousemove", (event: any) => {
          const [xPos, yPos] = d3.pointer(event, containerRef.current);
          tooltip.style("left", `${xPos}px`).style("top", `${yPos - 10}px`);
      })
      .on("mouseleave", function() {
          d3.select(this).attr("class", `bar-rect cursor-pointer ${colorClass}`);
          tooltip.style("opacity", 0);
      })
      .transition().duration(750).ease(d3.easeCubicOut)
      .attr("x", (d: any) => x(d.x0!) + 1)
      .attr("width", (d: any) => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
      .attr("y", (d: any) => y(d.length))
      .attr("height", (d: any) => innerHeight - y(d.length));

  }, [data, width, height, colorClass, hoverColorClass, xDomain]); 

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative w-full ${className}`} ref={containerRef}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      {/* Tooltip Element */}
      <div 
        ref={tooltipRef} 
        className="absolute pointer-events-none opacity-0 transition-opacity bg-white border border-gray-200 p-2 rounded shadow-lg z-50 transform -translate-x-1/2 -translate-y-full text-center whitespace-nowrap"
      />
    </div>
  );
};