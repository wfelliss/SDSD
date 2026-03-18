import { useMemo } from 'react';
import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { RawSuspensionData, normalizeToPercentage, getProfileFromRun } from "app/lib/telemetryUtils";

export const DYNAMIC_SAG_IDEAL_MIN = 25;
export const DYNAMIC_SAG_IDEAL_MAX = 35;
const BOTTOM_OUT_TRAVEL_MIN = 95;
const OFF_GROUND_TRAVEL_MAX = 5;

function getNormalizedSuspensionData(
  run: Run,
  jsonData: Record<number, RunJson>,
  type: 'front' | 'rear',
): number[] | null {
  const suspensionData: RawSuspensionData[] | undefined =
    jsonData[run.id]?.data?.suspension?.[type === 'front' ? 'front_sus' : 'rear_sus'];
  if (!suspensionData || suspensionData.length === 0) return null;

  const profile = getProfileFromRun(run);
  const min = profile ? (type === 'front' ? profile.front_min : profile.back_min) : undefined;
  const max = profile ? (type === 'front' ? profile.front_max : profile.back_max) : undefined;

  const normalized = suspensionData
    .map(p => {
      const val = typeof p === 'number' ? p : Number(p.displacement ?? 0);
      return normalizeToPercentage(val, min, max);
    })
    .filter(v => isFinite(v));

  return normalized.length === 0 ? null : normalized;
}

function dynamicSag(norm: number[] | null): number | null {
  if (!norm) return null;
  const sorted = [...norm].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function zonePercent(norm: number[] | null, lo: number, hi: number): number | null {
  if (!norm) return null;
  return (norm.filter(v => v >= lo && v <= hi).length / norm.length) * 100;
}

function zoneSeconds(
  norm: number[] | null,
  freq: number | null,
  lo: number,
  hi: number,
): number | null {
  if (!norm || !freq) return null;
  return norm.filter(v => v >= lo && v <= hi).length / freq;
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

    return {
      frontSag:          dynamicSag(frontNorm),
      rearSag:           dynamicSag(rearNorm),
      frontBottomOutPct: zonePercent(frontNorm, BOTTOM_OUT_TRAVEL_MIN, 100),
      frontBottomOutSec: zoneSeconds(frontNorm, frontFreq, BOTTOM_OUT_TRAVEL_MIN, 100),
      frontOffGroundPct: zonePercent(frontNorm, 0, OFF_GROUND_TRAVEL_MAX),
      frontOffGroundSec: zoneSeconds(frontNorm, frontFreq, 0, OFF_GROUND_TRAVEL_MAX),
      rearBottomOutPct:  zonePercent(rearNorm,  BOTTOM_OUT_TRAVEL_MIN, 100),
      rearBottomOutSec:  zoneSeconds(rearNorm,  rearFreq,  BOTTOM_OUT_TRAVEL_MIN, 100),
      rearOffGroundPct:  zonePercent(rearNorm,  0, OFF_GROUND_TRAVEL_MAX),
      rearOffGroundSec:  zoneSeconds(rearNorm,  rearFreq,  0, OFF_GROUND_TRAVEL_MAX),
      frontCompression:  calculateCompression(run, jsonData, 'front'),
      rearCompression:   calculateCompression(run, jsonData, 'rear'),
      frontRebound:      calculateRebound(run, jsonData, 'front'),
      rearRebound:       calculateRebound(run, jsonData, 'rear'),
    };
  }, [run, jsonData]);
}
