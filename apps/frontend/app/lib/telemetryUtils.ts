// ignore these utils on merge with main - this is old template system
export const MAX_TRAVEL = 4096; // replace with rider max travel data 
const WINDOWMS = 600 // histogram window length - usually 100ms to 300ms
const TEMP_MAX = 1000;

export type RawSuspensionData = number | { displacement: number; timebase?: number };

export interface StandardizedPoint {
  time: number;
  val: number; 
}
export interface NormalizedPoint {
  x: number; 
  y: number; 
}


export function normalizeToPercentage(val: number, min?: number, max?: number): number {
  // If caller provides a valid min/max range, use it; otherwise fall back to 0..MAX_TRAVEL
  const hasValidRange = typeof min === 'number' && typeof max === 'number' && isFinite(min) && isFinite(max) && max > min;

  if (!hasValidRange) {
    const result = 100 - (val / MAX_TRAVEL) * 100;
    return Number.isFinite(result) ? Math.min(100, Math.max(0, result)) : 0;
  }

  const pct = (val - (min as number)) / ((max as number) - (min as number));
  const result = 100 - pct * 100;
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
export function processLinePlotData(dataArr: RawSuspensionData[], freq: number): NormalizedPoint[] {
  const cleanData = standardizeData(dataArr, freq);
  
  return cleanData.map(point => ({
    x: point.time,
    y: normalizeToPercentage(point.val)
  }));
}

// TravelHistogram - Normalise displacement values for histogram distribution
export const processHistogramData = (dataArr: RawSuspensionData[]): number[] => {
  if (!Array.isArray(dataArr)) return [];

  return dataArr.map(p => {
    let val = 0;
    if (typeof p === 'number') {
      val = p;
    } else {
      val = Number(p.displacement ?? 0);
    }
    return normalizeToPercentage(val);
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