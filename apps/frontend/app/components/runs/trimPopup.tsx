import { useCallback, useEffect, useMemo, useState } from "react";
import { Run } from "@repo/database";
import { DisplacementPlot } from "app/components/graphs/domain/DisplacementPlot";
import { RunJson } from "app/types/runs";
import {
  RawSuspensionData,
  getProfileFromRun,
  resolveTrimBounds,
} from "app/lib/telemetryUtils";
import { RunUpdatePayload } from "app/api/runs";

interface TrimPopupProps {
  isOpen: boolean;
  run: Run | null;
  runJson?: RunJson;
  onClose: () => void;
  onSave: (id: number, payload: RunUpdatePayload) => Promise<void>;
}

function toRawSuspensionArray(value: unknown): RawSuspensionData[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as RawSuspensionData[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function boundsToSelection(
  lowerBound: number,
  upperBound: number,
  freq: number,
): [number, number] {
  if (!Number.isFinite(freq) || freq <= 0) {
    return [lowerBound, upperBound];
  }

  return [lowerBound / freq, upperBound / freq];
}

function selectionToBounds(
  selection: [number, number],
  freq: number,
  sampleLength: number,
): [number, number] {
  const lastIndex = Math.max(sampleLength - 1, 0);
  if (!Number.isFinite(freq) || freq <= 0) {
    return [0, lastIndex];
  }

  const lower = clamp(Math.round(selection[0] * freq), 0, lastIndex);
  const upper = clamp(Math.round(selection[1] * freq), lower, lastIndex);
  return [lower, upper];
}

export function TrimPopup({ isOpen, run, runJson, onClose, onSave }: TrimPopupProps) {
  const [lowerBound, setLowerBound] = useState(0);
  const [upperBound, setUpperBound] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const frontRaw = useMemo(
    () => toRawSuspensionArray(runJson?.data?.suspension?.front_sus),
    [runJson],
  );
  const rearRaw = useMemo(
    () => toRawSuspensionArray(runJson?.data?.suspension?.rear_sus),
    [runJson],
  );

  const sampleLength = useMemo(() => {
    const longestSeries = Math.max(frontRaw.length, rearRaw.length);
    if (longestSeries > 0) {
      return longestSeries;
    }
    return run?.length ?? 0;
  }, [frontRaw.length, rearRaw.length, run]);

  const profile = useMemo(() => (run ? getProfileFromRun(run) : null), [run]);
  const referenceFreq = run?.front_freq || run?.rear_freq || 100;

  useEffect(() => {
    if (!run || sampleLength <= 0) {
      setLowerBound(0);
      setUpperBound(0);
      return;
    }

    const bounds = resolveTrimBounds(run, sampleLength);
    if (!bounds) {
      setLowerBound(0);
      setUpperBound(0);
      return;
    }

    setLowerBound(bounds.lowerBoundIdx);
    setUpperBound(bounds.upperBoundIdx);
  }, [run, sampleLength, isOpen]);

  const maxIndex = Math.max(sampleLength - 1, 0);
  const hasData = sampleLength > 0;

  const safeLowerBound = clamp(lowerBound, 0, maxIndex);
  const safeUpperBound = clamp(upperBound, safeLowerBound, maxIndex);
  
  const brushSelection = useMemo(
    () => (hasData ? boundsToSelection(safeLowerBound, safeUpperBound, referenceFreq) : null),
    [hasData, safeLowerBound, safeUpperBound, referenceFreq],
  );

  const selectedSamples = hasData ? safeUpperBound - safeLowerBound + 1 : 0;

  const seriesConfig = useMemo(
    () => [
      {
        label: "Front Fork",
        rawData: frontRaw,
        freq: run?.front_freq || 100,
        min: profile?.front_min,
        max: profile?.front_max,
        dynamicSag: true,
      },
      {
        label: "Rear Shock",
        rawData: rearRaw,
        freq: run?.rear_freq || 100,
        min: profile?.back_min,
        max: profile?.back_max,
        dynamicSag: true,
      },
    ],
    [frontRaw, rearRaw, run, profile],
  );

  const canSave =
    !saving &&
    hasData &&
    safeLowerBound >= 0 &&
    safeUpperBound >= safeLowerBound &&
    safeUpperBound < sampleLength;

  const handleReset = useCallback(() => {
    setLowerBound(0);
    setUpperBound(maxIndex);
    setSaveError(null);
  }, [maxIndex]);

  const handleBrushSelection = useCallback((selection: [number, number] | null) => {
    if (!selection || !hasData) {
      return;
    }

    const [nextLower, nextUpper] = selectionToBounds(selection, referenceFreq, sampleLength);
    setLowerBound(nextLower);
    setUpperBound(nextUpper);
    setSaveError(null);
  }, [hasData, referenceFreq, sampleLength]);

  const handleSave = useCallback(async () => {
    if (!run || !canSave) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    // Use (length - 1) for scaling to handle indices correctly (fencepost safety)
    const scale = sampleLength > 1 ? (run.length - 1) / (sampleLength - 1) : 1;

    try {
      await onSave(run.id, {
        lower_bound_idx: Math.round(safeLowerBound * scale),
        // Clamp to ensure we never exceed DB run length due to float precision
        upper_bound_idx: Math.min(
          Math.round(safeUpperBound * scale),
          run.length - 1,
        ),
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save trim bounds.");
    } finally {
      setSaving(false);
    }
  }, [run, canSave, safeLowerBound, safeUpperBound, sampleLength, onSave, onClose]);

  // Early return only for JSX rendering, not hook execution
  if (!isOpen || !run) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Trim Run</h2>
            <p className="text-sm text-slate-600">
              Adjust inclusive sample bounds and save to apply trimmed charts.
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
        </div>

        {!hasData ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
            No telemetry data available for trimming this run.
          </div>
        ) : (
          <>
            <DisplacementPlot
              title={`Trim Editor - ${run.title ?? `Run ${run.id}`}`}
              brushSelection={brushSelection}
              onBrushSelection={handleBrushSelection}
              series={seriesConfig}
            />
            <p className="mt-4 text-sm text-slate-600">
              Drag the shaded selection in the lower subgraph to set trim bounds.
              Current selection: <strong>{safeLowerBound}</strong> to <strong>{safeUpperBound}</strong>
              {' '}({selectedSamples} / {sampleLength} samples)
            </p>

            {saveError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
            onClick={handleReset}
            disabled={!hasData || saving}
          >
            Reset run length
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? "Saving..." : "Save bounds"}
          </button>
        </div>
      </div>
    </div>
  );
}
