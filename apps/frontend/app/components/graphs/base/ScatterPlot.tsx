import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export interface ScatterPoint {
  x: number;
  y: number;
  id?: string;
  meta?: Record<string, unknown>;
}

export interface ScatterSeries {
  label: string;
  color?: string;
  points: ScatterPoint[];
  pointRadius?: number;
  opacity?: number;
}

export interface ScatterBand {
  start: number;
  end: number;
  color: string;
  label?: string;
}

export interface ScatterLine {
  label?: string;
  color?: string;
  points: ScatterPoint[];
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

interface ScatterPlotProps {
  series: ScatterSeries[];
  lines?: ScatterLine[];
  bands?: ScatterBand[];
  height?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  xLabel?: string;
  yLabel?: string;
  onPointClick?: (point: ScatterPoint, seriesIndex: number) => void;
}

export const ScatterPlot: React.FC<ScatterPlotProps> = ({
  series,
  lines = [],
  bands = [],
  height = 320,
  xDomain,
  yDomain,
  xLabel,
  yLabel,
  onPointClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const clipPathId = useId();

  const allPoints = useMemo(() => series.flatMap((s) => s.points), [series]);
  const hasData = allPoints.some(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(entry.contentRect.width);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || width === 0 || !hasData) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    tooltip.style("opacity", 0);

    const margin = { top: 20, right: 30, bottom: 46, left: 56 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    const xExtent = d3.extent(allPoints, (d) => d.x) as [number, number];
    const yExtent = d3.extent(allPoints, (d) => d.y) as [number, number];

    const finalXDomain: [number, number] = xDomain ?? [
      Number.isFinite(xExtent?.[0]) ? xExtent[0] : 0,
      Number.isFinite(xExtent?.[1]) ? xExtent[1] : 1,
    ];

    const finalYDomain: [number, number] = yDomain ?? [
      Number.isFinite(yExtent?.[0]) ? yExtent[0] : 0,
      Number.isFinite(yExtent?.[1]) ? yExtent[1] : 1,
    ];

    const x = d3.scaleLinear().domain(finalXDomain).range([0, innerWidth]);
    const y = d3.scaleLinear().domain(finalYDomain).range([innerHeight, 0]);

    svg
      .selectAll("defs")
      .data([null])
      .join("defs")
      .selectAll("clipPath")
      .data([null])
      .join("clipPath")
      .attr("id", clipPathId)
      .selectAll("rect")
      .data([null])
      .join("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    const g = svg
      .selectAll<SVGGElement, null>("g.plot")
      .data([null])
      .join("g")
      .attr("class", "plot")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const bandData = bands.filter(
      (b) =>
        Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start,
    );

    g.selectAll("rect.band")
      .data(bandData)
      .join("rect")
      .attr("class", "band")
      .attr("x", (d) => x(d.start))
      .attr("y", 0)
      .attr("width", (d) => Math.max(0, x(d.end) - x(d.start)))
      .attr("height", innerHeight)
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.18);

    const lineGenerator = d3
      .line<ScatterPoint>()
      .x((d) => x(d.x))
      .y((d) => y(d.y))
      .curve(d3.curveLinear);

    g.selectAll("path.trendline")
      .data(lines)
      .join("path")
      .attr("class", "trendline")
      .attr("clip-path", `url(#${clipPathId})`)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color ?? "#333")
      .attr("stroke-width", (d) => d.strokeWidth ?? 2)
      .attr("stroke-dasharray", (d) => d.strokeDasharray ?? null)
      .attr("opacity", (d) => d.opacity ?? 0.9)
      .attr("d", (d) => lineGenerator(d.points));

    const seriesGroups = g
      .selectAll<SVGGElement, ScatterSeries>("g.series")
      .data(series)
      .join("g")
      .attr("class", "series")
      .attr("clip-path", `url(#${clipPathId})`);

    seriesGroups
      .selectAll("circle.point")
      .data((d, seriesIndex) =>
        d.points.map((p) => ({ point: p, series: d, seriesIndex })),
      )
      .join("circle")
      .attr("class", "point")
      .attr("cx", (d) => x(d.point.x))
      .attr("cy", (d) => y(d.point.y))
      .attr("r", (d) => d.series.pointRadius ?? 2.5)
      .attr("fill", (d) => d.series.color ?? "#666")
      .attr("opacity", (d) => d.series.opacity ?? 0.7)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .on("mouseenter", function (event: MouseEvent, d) {
        d3.select(this).attr("r", (d.series.pointRadius ?? 2.5) + 1);
        if (tooltipRef.current) {
          const [xPos, yPos] = d3.pointer(event, containerRef.current);
          tooltip.style("opacity", 1);
          tooltip.selectAll("*").remove();
          const speed = d.point.meta?.speed;
          const displacement = d.point.meta?.displacement;
          const unit = d.point.meta?.unit;
          if (typeof speed === "number") {
            tooltip
              .append("div")
              .attr("class", "text-xs text-gray-600")
              .text(`Speed: ${speed.toFixed(1)} mm/s`);
          }
          if (typeof displacement === "number") {
            tooltip
              .append("div")
              .attr("class", "text-xs text-gray-600")
              .text(
                `Disp: ${displacement.toFixed(1)}${unit === "percent" ? "%" : " mm"}`,
              );
          }
          tooltip.style("left", `${xPos}px`).style("top", `${yPos - 12}px`);
        }
      })
      .on("mousemove", (event: MouseEvent) => {
        const [xPos, yPos] = d3.pointer(event, containerRef.current);
        tooltip.style("left", `${xPos}px`).style("top", `${yPos - 12}px`);
      })
      .on("mouseleave", function (_, d) {
        d3.select(this).attr("r", d.series.pointRadius ?? 2.5);
        tooltip.style("opacity", 0);
      })
      .on("click", (_, d) => {
        if (!onPointClick) return;
        onPointClick(d.point, d.seriesIndex ?? 0);
      });

    g.selectAll<SVGGElement, null>("g.x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(Math.max(2, Math.floor(innerWidth / 80))) as d3.Axis<number>,
      )
      .call((axisGroup) =>
        axisGroup
          .selectAll(".domain, .tick line")
          .attr("class", "stroke-border"),
      )
      .call((axisGroup) =>
        axisGroup
          .selectAll(".tick text")
          .attr("class", "text-muted-foreground text-xs"),
      );

    g.selectAll<SVGGElement, null>("g.y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5) as d3.Axis<number>)
      .call((axisGroup) =>
        axisGroup
          .selectAll(".domain, .tick line")
          .attr("class", "stroke-border"),
      )
      .call((axisGroup) =>
        axisGroup
          .selectAll(".tick text")
          .attr("class", "text-muted-foreground text-xs"),
      );

    if (xLabel) {
      g.selectAll("text.x-label")
        .data([null])
        .join("text")
        .attr("class", "x-label text-xs text-muted-foreground")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 34)
        .attr("text-anchor", "middle")
        .text(xLabel);
    }

    if (yLabel) {
      g.selectAll("text.y-label")
        .data([null])
        .join("text")
        .attr("class", "y-label text-xs text-muted-foreground")
        .attr("x", -innerHeight / 2)
        .attr("y", -42)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text(yLabel);
    }
  }, [
    series,
    lines,
    bands,
    width,
    height,
    xDomain,
    yDomain,
    xLabel,
    yLabel,
    hasData,
    onPointClick,
    clipPathId,
    allPoints,
  ]);

  if (!hasData) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
        No data
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative"
    >
      {width > 0 && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="overflow-visible"
        />
      )}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 transition-opacity bg-white border border-gray-200 p-2 rounded shadow-lg z-50 transform -translate-x-1/2 -translate-y-full text-center whitespace-nowrap"
      />
    </div>
  );
};
