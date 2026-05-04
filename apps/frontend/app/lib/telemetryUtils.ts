import { Profile, Run } from "@repo/database";

export const MAX_TRAVEL = 4096;
const WINDOWMS = 600;

export type RawSuspensionData =
  | number
  | { displacement: number; timebase?: number };

export interface StandardizedPoint {
  time: number;
  val: number;
}
export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface VelocitySample {
  index: number;
  time: number;
  displacement: number;
  normalized: number;
  velocity: number;
  speed: number;
}

export interface LinePoint {
  x: number;
  y: number;
}

export interface RunTrimBounds {
  lowerBoundIdx: number;
  upperBoundIdx: number;
}

function parseBound(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return null;
  }

  return value;
}

export function getProfileFromRun(run: Run): Profile | null {
  const profileCandidate = (run as Run & { profile?: unknown }).profile;
  if (
    !profileCandidate ||
    typeof profileCandidate !== "object" ||
    !("front_min" in profileCandidate) ||
    !("front_max" in profileCandidate) ||
    !("back_min" in profileCandidate) ||
    !("back_max" in profileCandidate)
  )
    return null;
  return profileCandidate as Profile;
}

export function resolveTrimBounds(run: Run, sampleLength: number): RunTrimBounds | null {
  if (!Number.isFinite(sampleLength) || sampleLength <= 0) {
    return null;
  }

  if (!Number.isFinite(run.length) || run.length <= 0) {
    return { lowerBoundIdx: 0, upperBoundIdx: sampleLength - 1 };
  }

  const runWithBounds = run as Run & {
    lower_bound_idx?: unknown;
    upper_bound_idx?: unknown;
  };

  const lastIndex = sampleLength - 1;
  const scale = sampleLength / run.length;
  const rawLower = runWithBounds.lower_bound_idx;
  const rawUpper = runWithBounds.upper_bound_idx;

  const parsedLower = parseBound(rawLower) ?? 0;
  const parsedUpper = parseBound(rawUpper) ?? (run.length - 1);

  const lowerBoundIdx = Math.min(Math.max(Math.round(parsedLower * scale), 0), lastIndex);
  const clampedUpper = Math.min(Math.max(Math.round(parsedUpper * scale), 0), lastIndex);
  const upperBoundIdx = Math.max(clampedUpper, lowerBoundIdx);

  return { lowerBoundIdx, upperBoundIdx };
}

export function trimRawDataByBounds<T>(run: Run, dataArr: T[]): T[] {
  if (!Array.isArray(dataArr) || dataArr.length === 0) {
    return [];
  }

  const bounds = resolveTrimBounds(run, dataArr.length);
  if (!bounds) {
    return [];
  }

  return dataArr.slice(bounds.lowerBoundIdx, bounds.upperBoundIdx + 1);
}

export function normalizeToPercentage(val: number, min?: number, max?: number): number {
  // If caller provides a valid min/max range, use it; otherwise fall back to 0..MAX_TRAVEL
  const hasValidRange =
    typeof min === "number" &&
    typeof max === "number" &&
    isFinite(min) &&
    isFinite(max) &&
    max > min;

  if (!hasValidRange) {
    const result = (val / MAX_TRAVEL) * 100;
    return Number.isFinite(result) ? Math.min(100, Math.max(0, result)) : 0;
  }

  const pct = (val - (min as number)) / ((max as number) - (min as number));
  const result = pct * 100;
  return Number.isFinite(result) ? Math.min(100, Math.max(0, result)) : 0;
}

export function standardizeData(
  dataArr: RawSuspensionData[],
  freq: number,
  indexOffset: number = 0,
): StandardizedPoint[] {
  if (!Array.isArray(dataArr)) return [];

  return dataArr.map((p, i) => {
    let val = 0;
    let time = (i + indexOffset) / freq;

    if (typeof p === "number") {
      val = p;
    } else {
      val = Number(p.displacement ?? 0);
      if (p.timebase !== undefined) {
        time = Number(p.timebase);
      }
    }

    return { time, val };
  });
}

// DisplacementPlot - Standardizes raw suspension data and maps it into normalized time-series points.
export function processLinePlotData(
  dataArr: RawSuspensionData[],
  freq: number,
  min?: number,
  max?: number,
  indexOffset: number = 0,
): NormalizedPoint[] {
  const cleanData = standardizeData(dataArr, freq, indexOffset);

  return cleanData.map((point) => ({
    x: point.time,
    y: normalizeToPercentage(point.val, min, max),
  }));
}

// TravelHistogram - Normalise displacement values for histogram distribution
export const processHistogramData = (
  dataArr: RawSuspensionData[],
  min?: number,
  max?: number,
): number[] => {
  if (!Array.isArray(dataArr)) return [];

  return dataArr
    .map((p) => {
      let val = 0;
      if (typeof p === "number") {
        val = p;
      } else {
        val = Number(p.displacement ?? 0);
      }
      return normalizeToPercentage(val, min, max);
    })
    .filter((v) => !isNaN(v) && isFinite(v));
};

// DynamicSagPlot - Moving average (over set time window)
export function calculateMovingAverage(
  data: NormalizedPoint[],
  freq: number,
): NormalizedPoint[] {
  const windowSize = Math.max(1, Math.floor((WINDOWMS / 1000) * freq));
  if (data.length < windowSize) return [];

  const halfWindowX = WINDOWMS / 1000 / 2; // centre x axis offset
  const result: NormalizedPoint[] = [];

  // Initial sum
  let currentSum = 0;
  for (let i = 0; i < windowSize; i++) {
    const pt = data[i]!;
    currentSum += pt.y;
  }

  // First centered point
  result.push({
    x: data[windowSize - 1]!.x - halfWindowX,
    y: currentSum / windowSize,
  });

  // Sliding window
  for (let i = windowSize; i < data.length; i++) {
    const outPt = data[i - windowSize]!;
    const inPt = data[i]!;

    currentSum -= outPt.y;
    currentSum += inPt.y;

    result.push({
      x: inPt.x - halfWindowX,
      y: currentSum / windowSize,
    });
  }

  return result;
}


// Velocity samples (mm/s) derived from displacement time-series.
export function buildVelocitySamples(
  dataArr: RawSuspensionData[],
  freq: number,
  min?: number,
  max?: number,
): VelocitySample[] {
  const cleanData = standardizeData(dataArr, freq);
  if (cleanData.length < 2) return [];

  const samples: VelocitySample[] = [];

  for (let i = 1; i < cleanData.length; i++) {
    const prev = cleanData[i - 1];
    const curr = cleanData[i];
    if (!prev || !curr) continue;

    const dt = curr.time - prev.time;
    if (!Number.isFinite(dt) || dt <= 0) continue;

    const displacement = curr.val;
    const velocity = (curr.val - prev.val) / dt;
    if (!Number.isFinite(velocity)) continue;

    const normalized = normalizeToPercentage(displacement, min, max);

    samples.push({
      index: i,
      time: curr.time,
      displacement,
      normalized,
      velocity,
      speed: Math.abs(velocity),
    });
  }

  return samples;
}

export function fitLine(
  points: LinePoint[],
): { slope: number; intercept: number } | null {
  if (!points || points.length < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  const n = points.length;

  for (const pt of points) {
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumXX += pt.x * pt.x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (!Number.isFinite(denominator) || denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;

  return { slope, intercept };
}

export function buildLineFromPoints(points: LinePoint[]): LinePoint[] {
  const fit = fitLine(points);
  if (!fit) return [];

  let minX = Infinity;
  let maxX = -Infinity;

  for (const pt of points) {
    if (!Number.isFinite(pt.x)) continue;
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX === maxX)
    return [];

  return [
    { x: minX, y: fit.slope * minX + fit.intercept },
    { x: maxX, y: fit.slope * maxX + fit.intercept },
  ];
}

/**
 * Largest-Triangle-Three-Buckets downsampling.
 * Reduces `data` to at most `threshold` points.
 * Returns the original array unchanged if data.length <= threshold.
 */
export function lttbDownsample<T extends { x: number; y: number }>(
  data: T[],
  threshold: number,
): T[] {
  if (data.length === 0) return data;
  if (threshold < 2) return threshold > 0 ? [data[0]!] : [];
  if (data.length <= threshold) return data;

  const sampled: T[] = [];
  sampled.push(data[0]!);

  const bucketCount = threshold - 2;
  const bucketSize = (data.length - 2) / bucketCount;
  let a = 0;

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = Math.floor(i * bucketSize) + 1;
    const bucketEnd   = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length - 1);

    const nextStart = bucketEnd;
    const nextEnd   = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);
    let avgX = 0, avgY = 0;
    const nextLen = nextEnd - nextStart;
    if (nextLen > 0) {
      for (let j = nextStart; j < nextEnd; j++) { avgX += data[j]!.x; avgY += data[j]!.y; }
      avgX /= nextLen; avgY /= nextLen;
    } else {
      avgX = data[data.length - 1]!.x; avgY = data[data.length - 1]!.y;
    }

    const pointA = data[a]!;
    let maxArea = -1, maxIndex = bucketStart;
    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs(
        (pointA.x - avgX) * (data[j]!.y - pointA.y) -
        (pointA.x - data[j]!.x) * (avgY - pointA.y),
      );
      if (area > maxArea) { maxArea = area; maxIndex = j; }
    }
    sampled.push(data[maxIndex]!);
    a = maxIndex;
  }

  sampled.push(data[data.length - 1]!);
  return sampled;
}
