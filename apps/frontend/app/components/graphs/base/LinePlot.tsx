import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export interface DataPoint {
  x: number;
  y: number;
}

interface LinePlotProps {
  data: DataPoint[][];
  yDomain?: [number, number];
  height?: number;
  className?: string;
  classForSeries?: (index: number) => string;
}

export const LinePlot: React.FC<LinePlotProps> = ({
  data,
  yDomain = [0, 100],
  height = 400,
  className = "",
  classForSeries,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);

  // Measure container width on resize to ensure chart fits
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      setWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Persist D3 scales and selection groups across renders to prevent expensive recreation
  const contextRef = useRef<any>({
    initialized: false,
    x: d3.scaleLinear(),
    y: d3.scaleLinear(),
    x2: d3.scaleLinear(),
    brush: null,     
    brushGroup: null, 
  });

  useEffect(() => {
    if (!svgRef.current || data.length === 0 || width === 0) return;

    const margin = { top: 20, right: 20, bottom: 110, left: 40 };
    const margin2 = { top: height - 70, right: 20, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const innerHeight2 = height - margin2.top - margin2.bottom;

    const svg = d3.select(svgRef.current);

    // Updates the Focus chart X-domain based on the Context brush selection
    const brushed = (event: d3.D3BrushEvent<unknown>) => {
      if (event.sourceEvent && event.sourceEvent.type === "zoom") return;
      
      const { x, x2, focus, xAxisGroup } = contextRef.current;
      
      // Convert pixel selection -> data domain
      const s = (event.selection as [number, number]) || x2.range();
      x.domain(s.map(x2.invert, x2));
      
      focus?.selectAll(".line-path").attr("d", 
        d3.line<DataPoint>()
          .x((d) => x(d.x))
          .y((d) => contextRef.current.y(d.y))
      );
      
      xAxisGroup?.call(d3.axisBottom(x));
    };

    // One-time DOM setup: Create groups, axes, and clip paths
    if (!contextRef.current.initialized) {
      svg.selectAll("*").remove();

      svg.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight);

      const focus = svg.append("g").attr("class", "focus").attr("transform", `translate(${margin.left},${margin.top})`);
      const context = svg.append("g").attr("class", "context").attr("transform", `translate(${margin2.left},${margin2.top})`);

      const xAxisGroup = focus.append("g")
        .attr("class", "axis axis--x text-muted-foreground text-xs")
        .attr("transform", `translate(0,${innerHeight})`);
      const yAxisGroup = focus.append("g").attr("class", "axis axis--y text-muted-foreground text-xs");
      const xAxis2Group = context.append("g")
        .attr("class", "axis axis--x text-muted-foreground text-xs")
        .attr("transform", `translate(0,${innerHeight2})`);

      const brush = d3.brushX()
        .extent([[0, 0], [innerWidth, innerHeight2]])
        .on("brush end", brushed);

      const brushGroup = context.append("g")
        .attr("class", "brush")
        .call(brush);

      contextRef.current = { 
        ...contextRef.current, 
        initialized: true, 
        focus, 
        context, 
        xAxisGroup, 
        yAxisGroup, 
        xAxis2Group,
        brush,       
        brushGroup   
      };
    }

    // React Update Cycle: Update domains, ranges, and redraw paths
    const { x, y, x2, focus, context, xAxisGroup, yAxisGroup, xAxis2Group, brush, brushGroup } = contextRef.current;

    svg.select("#clip rect").attr("width", innerWidth);

    const allPoints = data.flat();
    const xMax = d3.max(allPoints, (d) => d.x) || 0;
    
    x.range([0, innerWidth]).domain([0, xMax]);
    y.range([innerHeight, 0]).domain(yDomain);
    x2.range([0, innerWidth]).domain([0, xMax]);
    const y2 = d3.scaleLinear().range([innerHeight2, 0]).domain(yDomain);

    xAxisGroup!.call(d3.axisBottom(x));
    yAxisGroup!.call(d3.axisLeft(y).ticks(5));
    xAxis2Group!.call(d3.axisBottom(x2));

    const lineGenerator = d3.line<DataPoint>().x((d) => x(d.x)).y((d) => y(d.y));
    const lineGenerator2 = d3.line<DataPoint>().x((d) => x2(d.x)).y((d) => y2(d.y));

    // Render Focus lines
    focus!.selectAll(".line-path")
      .data(data)
      .join(
        (enter: any) => enter.append("path").attr("clip-path", "url(#clip)"),
        (update: any) => update,
        (exit: any) => exit.remove()
      )
      .attr("d", lineGenerator)
      .attr("class", (_: any, i: number) => `line-path ${classForSeries?.(i) ?? ""}`);

    // Render Context lines
    context!.selectAll(".line-context")
      .data(data)
      .join(
        (enter: any) => enter.append("path"),
        (update: any) => update,
        (exit: any) => exit.remove()
      )
      .attr("d", lineGenerator2)
      .attr("class", (_: any, i: number) => `line-context ${i % 2 === 0 ? "line-primary" : "line-secondary"}`);


    brush.extent([[0, 0], [innerWidth, innerHeight2]]);
    brushGroup.call(brush);
    brushGroup.selectAll(".selection").attr("class", "selection fill-muted-foreground/30 stroke-border");

  }, [data, width, height, yDomain]);

  return (
    <div ref={containerRef} className={`w-full bg-card rounded-lg ${className}`}>
      {width > 0 && <svg ref={svgRef} width={width} height={height} className="overflow-visible" />}
    </div>
  );
};