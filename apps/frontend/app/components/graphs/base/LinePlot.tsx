import React, { useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";

export interface DataPoint {
  x: number;
  y: number;
}

interface LinePlotProps {
  data: DataPoint[][];
  xDomain?: [number, number];
  yDomain?: [number, number];
  height?: number;
  className?: string;
  styleForSeries?: (index: number) => React.CSSProperties | undefined;
  brushSelection?: [number, number] | null;
  onBrushSelection?: (selection: [number, number] | null) => void;
}

export const LinePlot: React.FC<LinePlotProps> = React.memo(({
  data,
  xDomain,
  yDomain = [0, 100],
  height = 400,
  className = "",
  styleForSeries,
  brushSelection,
  onBrushSelection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const clipPathId = useId();
  const [width, setWidth] = useState(0);
  const brushRef = useRef<d3.BrushBehavior<any> | null>(null);
  const brushGroupRef = useRef<d3.Selection<any, any, any, any> | null>(null);
  const onBrushSelectionRef = useRef<typeof onBrushSelection>(onBrushSelection);
  const isApplyingExternalSelectionRef = useRef(false);
  const latestBrushSelectionRef = useRef<[number, number] | null>(null);
  
  // Persist scales for brush
  const scalesRef = useRef({
    x: d3.scaleLinear(),
    y: d3.scaleLinear(),
    x2: d3.scaleLinear(),
  });

  useEffect(() => {
    onBrushSelectionRef.current = onBrushSelection;
  }, [onBrushSelection]);

  // Resize observer (under graph)
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

  // Main D3 rendering logic (axes, paths, and brush setup)
  useEffect(() => {
    if (!svgRef.current || data.length === 0 || width === 0) return;

    const svg = d3.select(svgRef.current);
    const { x, y, x2 } = scalesRef.current;

    const margin = { top: 20, right: 20, bottom: 110, left: 40 };
    const margin2 = { top: height - 70, right: 20, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const innerHeight2 = height - margin2.top - margin2.bottom;

    if (innerWidth <= 0 || innerHeight <= 0 || innerHeight2 <= 0) return;

    // Determine X Domain
    let finalXDomain: [number, number];
    if (xDomain) {
      finalXDomain = xDomain;
    } else {
      const allPoints = data.flat();
      const xExtent = d3.extent(allPoints, (d) => d.x);
      finalXDomain = xExtent[0] !== undefined ? xExtent as [number, number] : [0, 100];
    }

    // Update scales
    x.range([0, innerWidth]).domain(finalXDomain);
    y.range([innerHeight, 0]).domain(yDomain);
    x2.range([0, innerWidth]).domain(finalXDomain);
    const y2 = d3.scaleLinear().range([innerHeight2, 0]).domain(yDomain);

    // Brushed interaction handler keeps the focus chart in sync while dragging.
    const brushed = (event: d3.D3BrushEvent<unknown>) => {
      if (event.sourceEvent?.type === "zoom") return;

      const s = event.selection as [number, number] | null;
      if (!s) {
        return;
      }

      x.domain(s.map(x2.invert, x2));

      const lineGenerator = d3.line<DataPoint>()
        .x((d) => x(d.x))
        .y((d) => y(d.y))
        .curve(d3.curveMonotoneX);

      svg.select(".focus")
        .selectAll<SVGPathElement, DataPoint[]>(".line-path")
        .attr("d", lineGenerator);

      svg.select<SVGGElement>(".focus .x-axis").call(d3.axisBottom(x));
    };

    // Emit selection to React only when brushing ends to avoid render thrash.
    const brushEnded = (event: d3.D3BrushEvent<unknown>) => {
      if (isApplyingExternalSelectionRef.current) {
        return;
      }

      // Ignore programmatic brush.move calls.
      if (!event.sourceEvent) {
        return;
      }

      const s = event.selection as [number, number] | null;
      if (!s) {
        latestBrushSelectionRef.current = null;
        onBrushSelectionRef.current?.(null);
        return;
      }

      const nextSelection = s.map(x2.invert, x2) as [number, number];
      latestBrushSelectionRef.current = nextSelection;
      onBrushSelectionRef.current?.(nextSelection);
    };

    // Clip path (scoped per component instance)
    svg.selectAll("defs").data([null]).join("defs")
      .selectAll("clipPath").data([null]).join("clipPath")
      .attr("id", clipPathId)
      .selectAll("rect").data([null]).join("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    // Focus group (main chart)
    const focus = svg.selectAll<SVGGElement, null>(".focus")
      .data([null])
      .join("g")
      .attr("class", "focus")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Context group (brush area)
    const context = svg.selectAll<SVGGElement, null>(".context")
      .data([null])
      .join("g")
      .attr("class", "context")
      .attr("transform", `translate(${margin2.left},${margin2.top})`);

    // Focus X Axis
    focus.selectAll<SVGGElement, null>(".x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis axis text-muted-foreground text-xs")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x) as d3.Axis<number>);

    // Focus Y Axis
    focus.selectAll<SVGGElement, null>(".y-axis")
      .data([null])
      .join("g")
      .attr("class", "y-axis axis text-muted-foreground text-xs")
      .call(d3.axisLeft(y).ticks(5) as d3.Axis<number>);

    // Context X Axis
    context.selectAll<SVGGElement, null>(".x-axis")
      .data([null])
      .join("g")
      .attr("class", "x-axis axis text-muted-foreground text-xs")
      .attr("transform", `translate(0,${innerHeight2})`)
      .call(d3.axisBottom(x2) as d3.Axis<number>);

    // Line generators with curve smoothing
    const lineGenerator = d3.line<DataPoint>()
      .x((d) => x(d.x))
      .y((d) => y(d.y))
      .curve(d3.curveMonotoneX);
    const lineGenerator2 = d3.line<DataPoint>()
      .x((d) => x2(d.x))
      .y((d) => y2(d.y))
      .curve(d3.curveMonotoneX);

    // Focus lines
    focus.selectAll<SVGPathElement, DataPoint[]>(".line-path")
      .data(data)
      .join("path")
      .attr("clip-path", `url(#${clipPathId})`)
      .attr("class", "line-path")
      .style("stroke", (_, i) => styleForSeries?.(i)?.stroke?.toString() ?? null)
      .style("opacity", (_, i) => {
        const opacity = styleForSeries?.(i)?.opacity;
        return typeof opacity === "number" ? opacity : null;
      })
      .style("stroke-width", (_, i) => {
        const strokeWidth = styleForSeries?.(i)?.strokeWidth;
        return strokeWidth !== undefined ? strokeWidth.toString() : null;
      })
      .attr("d", lineGenerator);

    // Context lines
    context.selectAll<SVGPathElement, DataPoint[]>(".line-context")
      .data(data)
      .join("path")
      .attr("class", "line-context")
      .style("stroke", (_, i) => styleForSeries?.(i)?.stroke?.toString() ?? null)
      .style("opacity", (_, i) => {
        const opacity = styleForSeries?.(i)?.opacity;
        return typeof opacity === "number" ? opacity : null;
      })
      .style("stroke-width", (_, i) => {
        const strokeWidth = styleForSeries?.(i)?.strokeWidth;
        return strokeWidth !== undefined ? strokeWidth.toString() : null;
      })
      .attr("d", lineGenerator2);

    // Brush
    const brush = d3.brushX<any>()
      .extent([[0, 0], [innerWidth, innerHeight2]])
      .on("brush", brushed)
      .on("end", brushEnded);

    context.selectAll<SVGGElement, null>(".brush")
      .data([null])
      .join("g")
      .attr("class", "brush")
      .call(brush)
      .selectAll(".selection")
      .attr("class", "selection fill-muted-foreground/30 stroke-border");

    brushRef.current = brush;
    brushGroupRef.current = context.select<SVGGElement>(".brush");

    if (brushSelection) {
      isApplyingExternalSelectionRef.current = true;
      brushGroupRef.current?.call(
        brush.move,
        brushSelection.map((value) => x2(value)) as [number, number],
      );
      isApplyingExternalSelectionRef.current = false;
      latestBrushSelectionRef.current = brushSelection;
    }

  }, [data, width, height, xDomain, yDomain, styleForSeries, clipPathId]);

  // External brush sync (e.g., reset/save/load) without re-running full chart setup.
  useEffect(() => {
    if (!brushRef.current || !brushGroupRef.current || data.length === 0 || width === 0) {
      return;
    }

    const { x2 } = scalesRef.current;

    const hasLatest = latestBrushSelectionRef.current !== null;
    const hasIncoming = brushSelection !== null && brushSelection !== undefined;

    if (!hasIncoming) {
      if (!hasLatest) {
        return;
      }

      isApplyingExternalSelectionRef.current = true;
      brushGroupRef.current.call(brushRef.current.move, null);
      isApplyingExternalSelectionRef.current = false;
      latestBrushSelectionRef.current = null;
      return;
    }

    const next = brushSelection as [number, number];
    const prev = latestBrushSelectionRef.current;

    if (prev && prev[0] === next[0] && prev[1] === next[1]) {
      return;
    }

    isApplyingExternalSelectionRef.current = true;
    brushGroupRef.current.call(
      brushRef.current.move,
      next.map((value) => x2(value)) as [number, number],
    );
    isApplyingExternalSelectionRef.current = false;
    latestBrushSelectionRef.current = next;
  }, [brushSelection, data.length, width]);

  return (
    <div ref={containerRef} className={`w-full bg-card rounded-lg ${className}`}>
      {width > 0 && <svg ref={svgRef} width={width} height={height} className="overflow-visible" />}
    </div>
  );
});