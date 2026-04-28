import React, { useMemo } from "react";
import {
  ScatterPlot,
  ScatterSeries,
  ScatterLine,
  ScatterBand,
} from "../base/ScatterPlot";
import {
  RawSuspensionData,
  buildLineFromPoints,
  LinePoint,
} from "app/lib/telemetryUtils";
import {
  processCompressions,
  SuspensionActivity,
} from "app/lib/run-analysis";
import { getSeriesColor } from "app/lib/graphColors";

export type SpeedRegion = {
  low: number;
  high: number;
};

interface ReboundCompressionPlotProps {
  title: string;
  series: {
    label: string;
    color?: string;
    rawData: RawSuspensionData[];
    freq: number;
    min?: number;
    max?: number;
    length?: number;
  }[];
  height?: number;
  speedRegion: SpeedRegion;
  onPointSelect?: (selection: {
    seriesIndex: number;
    startIndex: number;
    endIndex: number;
  }) => void;
}

type PreparedSeries = {
  label: string;
  color: string;
  freq: number;
  compressionScatterPoints: {
    x: number;
    y: number;
    id: string;
    meta: {
      startIndex: number;
      endIndex: number;
      speed: number;
      displacement: number;
    };
  }[];
  reboundScatterPoints: {
    x: number;
    y: number;
    id: string;
    meta: {
      startIndex: number;
      endIndex: number;
      speed: number;
      displacement: number;
    };
  }[];
  compressionPoints: LinePoint[];
  compressionLowPoints: LinePoint[];
  compressionHighPoints: LinePoint[];
  reboundPoints: LinePoint[];
  reboundLowPoints: LinePoint[];
  reboundHighPoints: LinePoint[];
};

const flipY = (pt: LinePoint): LinePoint => ({ x: pt.x, y: Math.abs(pt.y) });

function filterOutliers(
  suspensionActivity: SuspensionActivity[],
): SuspensionActivity[] {
  if (suspensionActivity.length === 0) return suspensionActivity;

  const velocities = suspensionActivity.map((a) => a.velocity);
  const displacements = suspensionActivity.map((a) => a.displacement);

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const std = (arr: number[], m: number) =>
    Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);

  const vMean = mean(velocities);
  const vStd = std(velocities, vMean);
  const dMean = mean(displacements);
  const dStd = std(displacements, dMean);

  return suspensionActivity.filter(
    (a) =>
      Math.abs(a.velocity - vMean) < 5 * vStd &&
      Math.abs(a.displacement - dMean) < 5 * dStd,
  );
}

export const ReboundCompressionPlot: React.FC<ReboundCompressionPlotProps> = ({
  title,
  series,
  height = 320,
  speedRegion,
  onPointSelect,
}) => {
  const prepared = useMemo<PreparedSeries[]>(() => {
    return series.map((s, index) => {
      const length = s.length ?? 220;
      const min = s.min ?? 0;
      const max = s.max ?? 4096;

      const activities = processCompressions(
        s.rawData,
        s.freq,
        length,
        min,
        max,
      );

      const toPoint = (a: SuspensionActivity): LinePoint => ({
        x: Math.abs(a.velocity),
        y: a.displacement,
      });

      const compressions = filterOutliers(
        activities.filter((a) => a.type === "compression"),
      );
      const rebounds = filterOutliers(
        activities.filter((a) => a.type === "rebound"),
      );

      const compressionPoints = compressions.map(toPoint);
      const reboundPoints = rebounds.map(toPoint).map(flipY);

      const compressionLowPoints = compressions
        .filter((a) => Math.abs(a.velocity) <= speedRegion.low)
        .map(toPoint);
      const compressionHighPoints = compressions
        .filter((a) => Math.abs(a.velocity) >= speedRegion.high)
        .map(toPoint);

      const reboundLowPoints = rebounds
        .filter((a) => Math.abs(a.velocity) <= speedRegion.low)
        .map(toPoint)
        .map(flipY);
      const reboundHighPoints = rebounds
        .filter((a) => Math.abs(a.velocity) >= speedRegion.high)
        .map(toPoint)
        .map(flipY);

      const makeScatterPoints = (
        acts: SuspensionActivity[],
        flip: boolean,
      ) =>
        acts.map((a, idx) => ({
          x: Math.abs(a.velocity),
          y: flip ? Math.abs(a.displacement) : a.displacement,
          id: `${index}-${flip ? "r" : "c"}-${idx}`,
          meta: {
            startIndex: Math.round(a.time.start * s.freq),
            endIndex: Math.round(a.time.end * s.freq),
            speed: Math.abs(a.velocity),
            displacement: a.displacement,
          },
        }));

      return {
        label: s.label,
        color: getSeriesColor(index, s.color),
        freq: s.freq,
        compressionScatterPoints: makeScatterPoints(compressions, false),
        reboundScatterPoints: makeScatterPoints(rebounds, true),
        compressionPoints,
        compressionLowPoints,
        compressionHighPoints,
        reboundPoints,
        reboundLowPoints,
        reboundHighPoints,
      };
    });
  }, [series, speedRegion.low, speedRegion.high]);

  const maxSpeed = useMemo(() => {
    let max = 0;
    prepared.forEach((p) => {
      [...p.compressionScatterPoints, ...p.reboundScatterPoints].forEach(
        (pt) => {
          if (pt.x > max) max = pt.x;
        },
      );
    });
    return max > 0 ? max : null;
  }, [prepared]);

  const xMax = maxSpeed
    ? Math.max(speedRegion.high, maxSpeed) * 1.05
    : speedRegion.high * 1.3;

  const compressionScatterSeries = useMemo<ScatterSeries[]>(() => {
    return prepared.map((p) => ({
      label: p.label,
      color: p.color,
      points: p.compressionScatterPoints,
      pointRadius: 2.5,
      opacity: 0.7,
    }));
  }, [prepared]);

  const reboundScatterSeries = useMemo<ScatterSeries[]>(() => {
    return prepared.map((p) => ({
      label: p.label,
      color: p.color,
      points: p.reboundScatterPoints,
      pointRadius: 2.5,
      opacity: 0.7,
    }));
  }, [prepared]);

  const buildTrendLines = (
    type: "compression" | "rebound",
  ): ScatterLine[] => {
    const lines: ScatterLine[] = [];

    prepared.forEach((p) => {
      const allPts =
        type === "compression" ? p.compressionPoints : p.reboundPoints;
      const lowPts =
        type === "compression"
          ? p.compressionLowPoints
          : p.reboundLowPoints;
      const highPts =
        type === "compression"
          ? p.compressionHighPoints
          : p.reboundHighPoints;
      const prefix = type === "compression" ? "comp" : "reb";

      const allLine = buildLineFromPoints(allPts);
      if (allLine.length > 0) {
        lines.push({
          label: `${p.label} ${type}`,
          color: p.color,
          points: allLine,
          strokeWidth: 2.5,
          opacity: 0.9,
        });
      }

      const lowLine = buildLineFromPoints(lowPts);
      if (lowLine.length > 0) {
        lines.push({
          label: `${p.label} ${prefix} low-speed`,
          color: p.color,
          points: lowLine,
          strokeWidth: 2,
          strokeDasharray: "4 4",
          opacity: 0.9,
        });
      }

      const highLine = buildLineFromPoints(highPts);
      if (highLine.length > 0) {
        lines.push({
          label: `${p.label} ${prefix} high-speed`,
          color: p.color,
          points: highLine,
          strokeWidth: 2,
          strokeDasharray: "2 6",
          opacity: 0.9,
        });
      }
    });

    return lines;
  };

  const compressionTrendLines = useMemo(
    () => buildTrendLines("compression"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prepared, maxSpeed, speedRegion.high],
  );

  const reboundTrendLines = useMemo(
    () => buildTrendLines("rebound"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prepared, maxSpeed, speedRegion.high],
  );

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

  const xLabel = "Speed (mm/s)";
  const yLabel = "Displacement (mm)";

  const handlePointClick =
    (filterType: "compression" | "rebound") =>
    (
      point: { meta?: Record<string, unknown> },
      seriesIndex: number,
    ) => {
      if (!onPointSelect) return;
      const startIndex =
        typeof point.meta?.startIndex === "number"
          ? (point.meta.startIndex as number)
          : 0;
      const endIndex =
        typeof point.meta?.endIndex === "number"
          ? (point.meta.endIndex as number)
          : 0;
      onPointSelect({ seriesIndex, startIndex, endIndex });
    };

  const plotHeight = Math.round(height * 0.75);

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">
            Low: 0–{speedRegion.low} mm/s · High: {speedRegion.high}+ mm/s
          </p>
        </div>
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

      <div className="flex flex-col gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            Compression
          </h4>
          <ScatterPlot
            series={compressionScatterSeries}
            lines={compressionTrendLines}
            bands={bands}
            height={plotHeight}
            xLabel={xLabel}
            yLabel={yLabel}
            xDomain={[0, xMax]}
            onPointClick={handlePointClick("compression")}
          />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Rebound</h4>
          <ScatterPlot
            series={reboundScatterSeries}
            lines={reboundTrendLines}
            bands={bands}
            height={plotHeight}
            xLabel={xLabel}
            yLabel={yLabel}
            xDomain={[0, xMax]}
            onPointClick={handlePointClick("rebound")}
          />
        </div>
      </div>
    </section>
  );
};
