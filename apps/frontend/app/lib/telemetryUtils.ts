import { Profile, Run } from "@repo/database";

export const MAX_TRAVEL = 4096;
const WINDOWMS = 600;

export type RawSuspensionData = number | { displacement: number; timebase?: number };

export interface StandardizedPoint {
  time: number;
  val: number; 
}
export interface NormalizedPoint {
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
  ) return null;
  return profileCandidate as Profile;
}

export function resolveTrimBounds(run: Run, sampleLength: number): RunTrimBounds | null {
  if (!Number.isFinite(sampleLength) || sampleLength <= 0) {
    return null;
  }

  const runWithBounds = run as Run & {
    lower_bound_idx?: unknown;
    upper_bound_idx?: unknown;
  };

  const lastIndex = sampleLength - 1;
  const rawLower = runWithBounds.lower_bound_idx;
  const rawUpper = runWithBounds.upper_bound_idx;

  const parsedLower = parseBound(rawLower) ?? 0;
  const parsedUpper = parseBound(rawUpper) ?? lastIndex;

  const lowerBoundIdx = Math.min(Math.max(parsedLower, 0), lastIndex);
  const clampedUpper = Math.min(Math.max(parsedUpper, 0), lastIndex);
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
  const hasValidRange = typeof min === 'number' && typeof max === 'number' && isFinite(min) && isFinite(max) && max > min;

  if (!hasValidRange) {
    const result = (val / MAX_TRAVEL) * 100;
    return Number.isFinite(result) ? Math.min(100, Math.max(0, result)) : 0;
  }

  const pct = (val - (min as number)) / ((max as number) - (min as number));
  const result = pct * 100;
  return Number.isFinite(result) ? Math.min(100, Math.max(0, result)) : 0;
}

export function standardizeData(dataArr: RawSuspensionData[], freq: number): StandardizedPoint[] {
  if (!Array.isArray(dataArr)) return [];
  
  return dataArr.map((p, i) => {
    let val = 0;
    let time = i / freq; 

    if (typeof p === 'number') {
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
export function processLinePlotData(dataArr: RawSuspensionData[], freq: number, min?: number, max?: number): NormalizedPoint[] {
  const cleanData = standardizeData(dataArr, freq);

  return cleanData.map(point => ({
    x: point.time,
    y: normalizeToPercentage(point.val, min, max)
  }));
}

// TravelHistogram - Normalise displacement values for histogram distribution
export const processHistogramData = (dataArr: RawSuspensionData[], min?: number, max?: number): number[] => {
  if (!Array.isArray(dataArr)) return [];

  return dataArr.map(p => {
    let val = 0;
    if (typeof p === 'number') {
      val = p;
    } else {
      val = Number(p.displacement ?? 0);
    }
    return normalizeToPercentage(val, min, max);
  }).filter(v => !isNaN(v) && isFinite(v));
};

// DynamicSagPlot - Moving average (over set time window)
export function calculateMovingAverage(
  data: NormalizedPoint[], 
  freq: number, 
): NormalizedPoint[] {

  const windowSize = Math.max(1, Math.floor((WINDOWMS / 1000) * freq));
  if (data.length < windowSize) return [];

  const halfWindowX = (WINDOWMS / 1000) / 2;  // centre x axis offset
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
    y: currentSum / windowSize
  });

  // Sliding window
  for (let i = windowSize; i < data.length; i++) {
    const outPt = data[i - windowSize]!;
    const inPt = data[i]!;

    currentSum -= outPt.y;
    currentSum += inPt.y;

    result.push({
      x: inPt.x - halfWindowX,
      y: currentSum / windowSize
    });
  }

  return result;
}