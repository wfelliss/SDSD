import { useMemo } from 'react';
import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { SectionHeader } from "app/components/ui/run-elements";
import { RawSuspensionData, normalizeToPercentage, getProfileFromRun } from "app/lib/telemetryUtils";
import { cn } from "app/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

const DYNAMIC_SAG_IDEAL_MIN = 25;
const DYNAMIC_SAG_IDEAL_MAX = 35;
const BOTTOM_OUT_TRAVEL_MIN = 95;
const OFF_GROUND_TRAVEL_MAX = 5;

interface SummarySectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

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

interface SagCellProps {
  value: number | null;
  type: 'front' | 'rear';
}

function SagCell({ value, type }: SagCellProps) {
  if (value === null) return <span>—</span>;

  const component = type === 'front' ? 'fork' : 'shock';
  const inRange = value >= DYNAMIC_SAG_IDEAL_MIN && value <= DYNAMIC_SAG_IDEAL_MAX;

  const pillClass = cn(
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
    inRange ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
  );

  return (
    <span className={pillClass}>
      {value.toFixed(1)}%
      {!inRange && value < DYNAMIC_SAG_IDEAL_MIN && (
        <span title={`Reduce pressure in the ${component}`}>
          <ArrowUp size={12} />
        </span>
      )}
      {!inRange && value > DYNAMIC_SAG_IDEAL_MAX && (
        <span title={`Increase pressure in the ${component}`}>
          <ArrowDown size={12} />
        </span>
      )}
    </span>
  );
}

interface TravelZoneCellProps {
  value: number | null;
  seconds?: number | null;
}

function TravelZoneCell({ value, seconds }: TravelZoneCellProps) {
  if (value === null) return <span>—</span>;

  // TODO: add red threshold logic when thresholds are decided
  const pillClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800";
  const tooltip = seconds != null ? `${seconds.toFixed(2)} s` : undefined;

  return <span className={pillClass} title={tooltip}>{value.toFixed(1)}%</span>;
}

function calculateCompression(_run: Run, _jsonData: Record<number, RunJson>, _type: 'front' | 'rear') {
  return 0;
}

function calculateRebound(_run: Run, _jsonData: Record<number, RunJson>, _type: 'front' | 'rear') {
  return 0;
}

interface RunSummaryRowProps {
  run: Run;
  jsonData: Record<number, RunJson>;
}

function RunSummaryRow({ run, jsonData }: RunSummaryRowProps) {
  const metrics = useMemo(() => {
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

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-foreground">{run.title || `Run ${run.id}`}</td>
      <td className="px-3 py-2 border-l border-border">
        <SagCell value={metrics.frontSag} type="front" />
      </td>
      <td className="px-3 py-2 text-foreground">{metrics.frontCompression}</td>
      <td className="px-3 py-2 text-foreground">{metrics.frontRebound}</td>
      <td className="px-3 py-2">
        <TravelZoneCell value={metrics.frontBottomOutPct} seconds={metrics.frontBottomOutSec} />
      </td>
      <td className="px-3 py-2">
        <TravelZoneCell value={metrics.frontOffGroundPct} seconds={metrics.frontOffGroundSec} />
      </td>
      <td className="px-3 py-2 border-l border-border">
        <SagCell value={metrics.rearSag} type="rear" />
      </td>
      <td className="px-3 py-2 text-foreground">{metrics.rearCompression}</td>
      <td className="px-3 py-2 text-foreground">{metrics.rearRebound}</td>
      <td className="px-3 py-2">
        <TravelZoneCell value={metrics.rearBottomOutPct} seconds={metrics.rearBottomOutSec} />
      </td>
      <td className="px-3 py-2">
        <TravelZoneCell value={metrics.rearOffGroundPct} seconds={metrics.rearOffGroundSec} />
      </td>
    </tr>
  );
}

interface SummaryTableProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
}

function SummaryTable({ selected, jsonData }: SummaryTableProps) {
  if (!selected || selected.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No runs selected.</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-white">
      <table className="min-w-[900px] w-full text-sm bg-white">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Run
            </th>
            <th
              className="px-3 py-2 font-semibold text-foreground text-center border-l border-border"
              scope="col"
              colSpan={5}
            >
              Fork
            </th>
            <th
              className="px-3 py-2 font-semibold text-foreground text-center border-l border-border"
              scope="col"
              colSpan={5}
            >
              Shock
            </th>
          </tr>
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              &nbsp;
            </th>
            <th className="px-3 py-2 font-semibold text-foreground border-l border-border" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottomed Out</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Off Ground</th>
            <th className="px-3 py-2 font-semibold text-foreground border-l border-border" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottomed Out</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Off Ground</th>
          </tr>
        </thead>
        <tbody>
          {selected.map((run) => (
            <RunSummaryRow key={run.id} run={run} jsonData={jsonData} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface MobileRunSummaryRowProps {
  run: Run;
  jsonData: Record<number, RunJson>;
  type: 'fork' | 'shock';
}

function MobileRunSummaryRow({ run, jsonData, type }: MobileRunSummaryRowProps) {
  const metrics = useMemo(() => {
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

  const isFork = type === 'fork';

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-foreground">{run.title || `Run ${run.id}`}</td>
      <td className="px-3 py-2">
        <SagCell value={isFork ? metrics.frontSag : metrics.rearSag} type={isFork ? 'front' : 'rear'} />
      </td>
      <td className="px-3 py-2 text-foreground">{isFork ? metrics.frontCompression : metrics.rearCompression}</td>
      <td className="px-3 py-2 text-foreground">{isFork ? metrics.frontRebound : metrics.rearRebound}</td>
      <td className="px-3 py-2">
        <TravelZoneCell
          value={isFork ? metrics.frontBottomOutPct : metrics.rearBottomOutPct}
          seconds={isFork ? metrics.frontBottomOutSec : metrics.rearBottomOutSec}
        />
      </td>
      <td className="px-3 py-2">
        <TravelZoneCell
          value={isFork ? metrics.frontOffGroundPct : metrics.rearOffGroundPct}
          seconds={isFork ? metrics.frontOffGroundSec : metrics.rearOffGroundSec}
        />
      </td>
    </tr>
  );
}

interface MobileSummaryTableProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
}

function MobileSummaryTable({ selected, jsonData }: MobileSummaryTableProps) {
  if (!selected || selected.length === 0) {
    return <div className="text-sm text-muted-foreground">No runs selected.</div>;
  }

  const tableFor = (type: 'fork' | 'shock') => (
    <div className="overflow-x-auto rounded-md border border-border bg-white">
      <table className="w-full text-sm bg-white">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Run</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Dynamic Sag</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Compression</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Rebound</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottomed Out</th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Off Ground</th>
          </tr>
        </thead>
        <tbody>
          {selected.map((run) => (
            <MobileRunSummaryRow key={run.id} run={run} jsonData={jsonData} type={type} />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-600 mb-2">Fork</p>
        {tableFor('fork')}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600 mb-2">Shock</p>
        {tableFor('shock')}
      </div>
    </div>
  );
}

export function SummarySection({
  selected,
  jsonData,
  isCompareMode,
}: SummarySectionProps) {
  return (
    <section className="w-full">
      <SectionHeader>{isCompareMode ? "Comparison Summary" : "Summary"}</SectionHeader>
      {/* Mobile: tabbed Fork / Shock view */}
      <div className="md:hidden">
        <MobileSummaryTable selected={selected} jsonData={jsonData} />
      </div>
      {/* Desktop: full table */}
      <div className="hidden md:block">
        <SummaryTable selected={selected} jsonData={jsonData} />
      </div>
    </section>
  );
}
