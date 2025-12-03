// --- FALLBACK CONSTANTS ---
export const MAX_TRAVEL = 1024; // replace with rider max travel data
const WINDOWMS = 500 // histogram window length - usually 100ms to 300ms window


// --- TYPE DEFINITIONS ---
export type RawSuspensionData = number | { displacement: number; timebase?: number };

export interface StandardizedPoint {
  time: number;
  val: number; 
}

export interface NormalizedPoint {
  x: number; 
  y: number; 
}

// --- RANGE TO PERCENTAGE ---
export function normalizeToPercentage(val: number): number {
  return 100 - (val / MAX_TRAVEL) * 100;
}

// --- DATA CLEANUP ---
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

// --- PLOT TRANSFORMATIONS ---

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
    currentSum += data[i].y;
  }

  // First centered point
  result.push({
    x: data[windowSize - 1].x - halfWindowX,
    y: currentSum / windowSize
  });

  // Sliding window
  for (let i = windowSize; i < data.length; i++) {
    currentSum -= data[i - windowSize].y;
    currentSum += data[i].y;

    result.push({
      x: data[i].x - halfWindowX,
      y: currentSum / windowSize
    });
  }

  return result;
}