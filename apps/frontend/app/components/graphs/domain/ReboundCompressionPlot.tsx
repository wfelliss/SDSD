import React, { useMemo, useState } from "react";
import {
  ScatterPlot,
  ScatterSeries,
  ScatterLine,
  ScatterBand,
} from "../base/ScatterPlot";
import {
  RawSuspensionData,
  buildVelocitySamples,
  buildLineFromPoints,
  VelocitySample,
  LinePoint,
} from "app/lib/telemetryUtils";
import { getSeriesColor } from "app/lib/graphColors";

export type SpeedRegion = {
  low: number;
  high: number;
};

export type UnitMode = "mm" | "percent";

interface ReboundCompressionPlotProps {
  title: string;
  series: {
    label: string;
    color?: string;
    rawData: RawSuspensionData[];
    freq: number;
    min?: number;
    max?: number;
  }[];
  mode: "compression" | "rebound";
  height?: number;
  speedRegion: SpeedRegion;
  unitMode?: UnitMode;
  onUnitModeChange?: (mode: UnitMode) => void;
  onPointSelect?: (selection: { seriesIndex: number; index: number }) => void;
}

type PreparedSeries = {
  label: string;
  color: string;
  samples: VelocitySample[];
  points: LinePoint[];
  lowPoints: LinePoint[];
  highPoints: LinePoint[];
  scatterPoints: {
    x: number;
    y: number;
    id: string;
    meta: {
      index: number;
      speed: number;
      displacement: number;
      unit: UnitMode;
    };
  }[];
};

const DEFAULT_UNIT: UnitMode = "percent";

const toggleLabels: Record<UnitMode, string> = {
  percent: "%",
  mm: "mm",
};

const formatModeLabel = (mode: UnitMode) =>
  mode === "percent" ? "% travel" : "mm displacement";

export const ReboundCompressionPlot: React.FC<ReboundCompressionPlotProps> = ({
  title,
  series,
  mode,
  height = 320,
  speedRegion,
  unitMode = DEFAULT_UNIT,
  onUnitModeChange,
  onPointSelect,
}) => {
  const [internalMode, setInternalMode] = useState<UnitMode>(unitMode);
  const activeMode = onUnitModeChange ? unitMode : internalMode;

  const prepared = useMemo<PreparedSeries[]>(() => {
    return series.map((s, index) => {
      const samples = buildVelocitySamples(s.rawData, s.freq, s.min, s.max);
      const filtered = samples.filter((sample) =>
        mode === "compression" ? sample.velocity > 0 : sample.velocity < 0,
      );

      const points = filtered.map((sample) => ({
        x: sample.speed,
        y: activeMode === "percent" ? sample.normalized : sample.displacement,
      }));

      const lowPoints = filtered
        .filter((sample) => sample.speed <= speedRegion.low)
        .map((sample) => ({
          x: sample.speed,
          y: activeMode === "percent" ? sample.normalized : sample.displacement,
        }));

      const highPoints = filtered
        .filter((sample) => sample.speed >= speedRegion.high)
        .map((sample) => ({
          x: sample.speed,
          y: activeMode === "percent" ? sample.normalized : sample.displacement,
        }));

      const scatterPoints = filtered.map((sample) => ({
        x: sample.speed,
        y: activeMode === "percent" ? sample.normalized : sample.displacement,
        id: `${index}-${sample.index}`,
        meta: {
          index: sample.index,
          speed: sample.speed,
          displacement:
            activeMode === "percent" ? sample.normalized : sample.displacement,
          unit: activeMode,
        },
      }));

      return {
        label: s.label,
        color: getSeriesColor(index, s.color),
        samples,
        points,
        lowPoints,
        highPoints,
        scatterPoints,
      };
    });
  }, [series, mode, speedRegion.low, speedRegion.high, activeMode]);

  const maxSpeed = useMemo(() => {
    let max = 0;
    prepared.forEach((p) => {
      p.samples.forEach((sample) => {
        if (sample.speed > max) max = sample.speed;
      });
    });
    return max > 0 ? max : null;
  }, [prepared]);

  const scatterSeries = useMemo<ScatterSeries[]>(() => {
    return prepared.map((p) => ({
      label: p.label,
      color: p.color,
      points: p.scatterPoints,
      pointRadius: 2.5,
      opacity: 0.7,
    }));
  }, [prepared]);

  const trendLines = useMemo<ScatterLine[]>(() => {
    const lines: ScatterLine[] = [];

    prepared.forEach((p) => {
      const allLine = buildLineFromPoints(p.points);
      if (allLine.length > 0) {
        lines.push({
          label: `${p.label} overall`,
          color: p.color,
          points: allLine,
          strokeWidth: 2.5,
          opacity: 0.9,
        });
      }

      const lowLine = buildLineFromPoints(p.lowPoints);
      if (lowLine.length > 0) {
        lines.push({
          label: `${p.label} low-speed`,
          color: p.color,
          points: lowLine,
          strokeWidth: 2,
          strokeDasharray: "4 4",
          opacity: 0.9,
        });
      }

      const highLine = buildLineFromPoints(p.highPoints);
      if (highLine.length > 0) {
        lines.push({
          label: `${p.label} high-speed`,
          color: p.color,
          points: highLine,
          strokeWidth: 2,
          strokeDasharray: "2 6",
          opacity: 0.9,
        });
      }
    });

    return lines;
  }, [prepared]);

  const bands = useMemo<ScatterBand[]>(() => {
    const maxBand =
      maxSpeed && Number.isFinite(maxSpeed)
        ? maxSpeed * 1.05
        : speedRegion.high * 1.4;
    return [
      {
        start: 0,
        end: speedRegion.low,
        color: "#a7f3d0",
        label: "Low-speed",
      },
      {
        start: speedRegion.high,
        end: Math.max(maxBand, speedRegion.high + 20),
        color: "#fde68a",
        label: "High-speed",
      },
    ];
  }, [speedRegion, maxSpeed]);

  const handleToggle = () => {
    const next = activeMode === "percent" ? "mm" : "percent";
    if (onUnitModeChange) {
      onUnitModeChange(next);
    } else {
      setInternalMode(next);
    }
  };

  const yLabel = formatModeLabel(activeMode);
  const xLabel = "Speed (mm/s)";

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">
            Low speed: 0–{speedRegion.low} mm/s · High speed: {speedRegion.high}
            + mm/s
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <span className="text-gray-400">Y-axis</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-800">
            {toggleLabels[activeMode]}
          </span>
          <span className="text-gray-400">toggle</span>
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        {prepared.map((p) => (
          <div key={p.label} className="flex items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-gray-600">{p.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="inline-flex h-0.5 w-6 bg-gray-800" />
          <span className="text-gray-500">Best fit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-0.5 w-6 border-t-2 border-dashed border-gray-600" />
          <span className="text-gray-500">Low speed fit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-0.5 w-6 border-t-2 border-dotted border-gray-600" />
          <span className="text-gray-500">High speed fit</span>
        </div>
      </div>

      <ScatterPlot
        series={scatterSeries}
        lines={trendLines}
        bands={bands}
        height={height}
        xLabel={xLabel}
        yLabel={yLabel}
        xDomain={[
          0,
          maxSpeed
            ? Math.max(speedRegion.high, maxSpeed) * 1.05
            : speedRegion.high * 1.3,
        ]}
        yDomain={activeMode === "percent" ? [0, 100] : undefined}
        onPointClick={(point, seriesIndex) => {
          if (!onPointSelect) return;
          const index =
            typeof point.meta?.index === "number"
              ? (point.meta.index as number)
              : 0;
          onPointSelect({ seriesIndex, index });
        }}
      />
    </section>
  );
};
