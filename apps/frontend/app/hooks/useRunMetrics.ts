import { useMemo } from 'react';
import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { RawSuspensionData, normalizeToPercentage, getProfileFromRun, trimRawDataByBounds } from "app/lib/telemetryUtils";

export const DYNAMIC_SAG_IDEAL_MIN_FRONT = 25;
export const DYNAMIC_SAG_IDEAL_MAX_FRONT = 35;
export const DYNAMIC_SAG_IDEAL_MIN_REAR = 25;
export const DYNAMIC_SAG_IDEAL_MAX_REAR = 35;
export const BOTTOM_OUT_TRAVEL_MIN = 95;
export const BOTTOM_OUT_COUNT_THRESHOLD = 3;
const OFF_GROUND_TRAVEL_MAX = 5;

export function getNormalizedSuspensionData(
  run: Run,
  jsonData: Record<number, RunJson>,
  type: 'front' | 'rear',
): number[] | null {
  const suspensionData: RawSuspensionData[] | undefined =
    jsonData[run.id]?.data?.suspension?.[type === 'front' ? 'front_sus' : 'rear_sus'];
  if (!suspensionData || suspensionData.length === 0) return null;

  const trimmedSuspensionData = trimRawDataByBounds(run, suspensionData);
  if (trimmedSuspensionData.length === 0) return null;

  const profile = getProfileFromRun(run);
  const min = profile ? (type === 'front' ? profile.front_min : profile.back_min) : undefined;
  const max = profile ? (type === 'front' ? profile.front_max : profile.back_max) : undefined;

  const normalized = trimmedSuspensionData
    .map(p => {
      const val = typeof p === 'number' ? p : Number(p.displacement ?? 0);
      return normalizeToPercentage(val, min, max);
    })
    .filter(v => isFinite(v));

  return normalized.length === 0 ? null : normalized;
}

export function dynamicSag(norm: number[] | null): number | null {
  if (!norm) return null;
  const sorted = [...norm].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function zonePercent(norm: number[] | null, lo: number, hi: number): number | null {
  if (!norm) return null;
  return (norm.filter(v => v >= lo && v <= hi).length / norm.length) * 100;
}

export function zoneSeconds(
  norm: number[] | null,
  freq: number | null,
  lo: number,
  hi: number,
): number | null {
  if (!norm || !freq) return null;
  return norm.filter(v => v >= lo && v <= hi).length / freq;
}

export function maxTravel(norm: number[] | null): number | null {
  if (!norm || norm.length === 0) return null;
  return norm.reduce((max, v) => (v > max ? v : max), -Infinity);
}

export function countZoneEntries(norm: number[] | null, lo: number, hi: number): number | null {
  if (!norm || norm.length === 0) return null;
  let count = 0;
  let inZone = norm[0]! >= lo && norm[0]! <= hi;
  if (inZone) count++;
  for (let i = 1; i < norm.length; i++) {
    const nowInZone = norm[i]! >= lo && norm[i]! <= hi;
    if (nowInZone && !inZone) count++;
    inZone = nowInZone;
  }
  return count;
}

function calculateCompression(_run: Run, _jsonData: Record<number, RunJson>, _type: 'front' | 'rear') {
  return 0;
}

function calculateRebound(_run: Run, _jsonData: Record<number, RunJson>, _type: 'front' | 'rear') {
  return 0;
}

export function useRunMetrics(run: Run, jsonData: Record<number, RunJson>) {
  return useMemo(() => {
    const frontNorm = getNormalizedSuspensionData(run, jsonData, 'front');
    const rearNorm  = getNormalizedSuspensionData(run, jsonData, 'rear');
    const frontFreq = run.front_freq ?? null;
    const rearFreq  = run.rear_freq  ?? null;

    const frontSag = dynamicSag(frontNorm);
    const rearSag  = dynamicSag(rearNorm);

    return {
      frontSag,
      rearSag,
      frontSagInRange: frontSag === null ? null : frontSag >= DYNAMIC_SAG_IDEAL_MIN_FRONT && frontSag <= DYNAMIC_SAG_IDEAL_MAX_FRONT,
      rearSagInRange:  rearSag  === null ? null : rearSag  >= DYNAMIC_SAG_IDEAL_MIN_REAR  && rearSag  <= DYNAMIC_SAG_IDEAL_MAX_REAR,
      frontBottomOutPct:   zonePercent(frontNorm, BOTTOM_OUT_TRAVEL_MIN, 100),
      frontBottomOutSec:   zoneSeconds(frontNorm, frontFreq, BOTTOM_OUT_TRAVEL_MIN, 100),
      frontBottomOutCount: countZoneEntries(frontNorm, BOTTOM_OUT_TRAVEL_MIN, 100),
      frontMaxTravel:      maxTravel(frontNorm),
      frontOffGroundPct: zonePercent(frontNorm, 0, OFF_GROUND_TRAVEL_MAX),
      frontOffGroundSec: zoneSeconds(frontNorm, frontFreq, 0, OFF_GROUND_TRAVEL_MAX),
      rearBottomOutPct:   zonePercent(rearNorm,  BOTTOM_OUT_TRAVEL_MIN, 100),
      rearBottomOutSec:   zoneSeconds(rearNorm,  rearFreq,  BOTTOM_OUT_TRAVEL_MIN, 100),
      rearBottomOutCount: countZoneEntries(rearNorm, BOTTOM_OUT_TRAVEL_MIN, 100),
      rearMaxTravel:       maxTravel(rearNorm),
      rearOffGroundPct:  zonePercent(rearNorm,  0, OFF_GROUND_TRAVEL_MAX),
      rearOffGroundSec:  zoneSeconds(rearNorm,  rearFreq,  0, OFF_GROUND_TRAVEL_MAX),
      frontCompression:  calculateCompression(run, jsonData, 'front'),
      rearCompression:   calculateCompression(run, jsonData, 'rear'),
      frontRebound:      calculateRebound(run, jsonData, 'front'),
      rearRebound:       calculateRebound(run, jsonData, 'rear'),
    };
  }, [run, jsonData]);
}
