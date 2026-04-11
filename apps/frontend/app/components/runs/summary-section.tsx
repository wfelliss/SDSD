import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { SectionHeader } from "app/components/ui/run-elements";
import { cn } from "app/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useRunMetrics, DYNAMIC_SAG_IDEAL_MIN_FRONT, DYNAMIC_SAG_IDEAL_MAX_FRONT, DYNAMIC_SAG_IDEAL_MIN_REAR, DYNAMIC_SAG_IDEAL_MAX_REAR, BOTTOM_OUT_COUNT_THRESHOLD, BOTTOM_OUT_TRAVEL_MIN } from "app/hooks/useRunMetrics";

interface SummarySectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

interface SagCellProps {
  value: number | null;
  type: 'front' | 'rear';
}

function SagCell({ value, type }: SagCellProps) {
  if (value === null) return <span>—</span>;

  const component = type === 'front' ? 'fork' : 'shock';
  const min = type === 'front' ? DYNAMIC_SAG_IDEAL_MIN_FRONT : DYNAMIC_SAG_IDEAL_MIN_REAR;
  const max = type === 'front' ? DYNAMIC_SAG_IDEAL_MAX_FRONT : DYNAMIC_SAG_IDEAL_MAX_REAR;
  const inRange = value >= min && value <= max;

  const pillClass = cn(
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
    inRange ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
  );

  return (
    <span className={pillClass}>
      {value.toFixed(1)}%
      {!inRange && value < min && (
        <span title={`Reduce pressure in the ${component}`}>
          <ArrowUp size={12} />
        </span>
      )}
      {!inRange && value > max && (
        <span title={`Increase pressure in the ${component}`}>
          <ArrowDown size={12} />
        </span>
      )}
    </span>
  );
}

interface BottomOutCellProps {
  count: number | null;
  maxTravel: number | null;
  sagInRange: boolean | null;
}

function BottomOutCell({ count, maxTravel, sagInRange }: BottomOutCellProps) {
  if (count === null) return <span>—</span>;

  let tooltip: string;
  let color: string;

  if (sagInRange === false) {
    tooltip = 'Correct sag prior to volume spacers';
    color = 'bg-red-100 text-red-800';
  } else if (count > BOTTOM_OUT_COUNT_THRESHOLD) {
    tooltip = 'Add a volume spacer';
    color = 'bg-red-100 text-red-800';
  } else if (count === 0 && maxTravel !== null && maxTravel < BOTTOM_OUT_TRAVEL_MIN) {
    tooltip = 'Remove volume spacer';
    color = 'bg-red-100 text-red-800';
  } else {
    tooltip = 'Correct volume spacers';
    color = 'bg-green-100 text-green-800';
  }

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', color)}
      title={tooltip}
    >
      {count}
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

interface RunSummaryRowProps {
  run: Run;
  jsonData: Record<number, RunJson>;
}

function RunSummaryRow({ run, jsonData }: RunSummaryRowProps) {
  const metrics = useRunMetrics(run, jsonData);

  const frontSagInRange = metrics.frontSag === null ? null
    : metrics.frontSag >= DYNAMIC_SAG_IDEAL_MIN_FRONT && metrics.frontSag <= DYNAMIC_SAG_IDEAL_MAX_FRONT;
  const rearSagInRange = metrics.rearSag === null ? null
    : metrics.rearSag >= DYNAMIC_SAG_IDEAL_MIN_REAR && metrics.rearSag <= DYNAMIC_SAG_IDEAL_MAX_REAR;

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-foreground">{run.title || `Run ${run.id}`}</td>
      <td className="px-3 py-2 border-l border-border">
        <SagCell value={metrics.frontSag} type="front" />
      </td>
      <td className="px-3 py-2 text-foreground">{metrics.frontCompression}</td>
      <td className="px-3 py-2 text-foreground">{metrics.frontRebound}</td>
      <td className="px-3 py-2">
        <BottomOutCell count={metrics.frontBottomOutCount} maxTravel={metrics.frontMaxTravel} sagInRange={frontSagInRange} />
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
        <BottomOutCell count={metrics.rearBottomOutCount} maxTravel={metrics.rearMaxTravel} sagInRange={rearSagInRange} />
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
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottom Outs</th>
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
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottom Outs</th>
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
  const metrics = useRunMetrics(run, jsonData);

  const isFork = type === 'fork';
  const sag = isFork ? metrics.frontSag : metrics.rearSag;
  const sagMin = isFork ? DYNAMIC_SAG_IDEAL_MIN_FRONT : DYNAMIC_SAG_IDEAL_MIN_REAR;
  const sagMax = isFork ? DYNAMIC_SAG_IDEAL_MAX_FRONT : DYNAMIC_SAG_IDEAL_MAX_REAR;
  const sagInRange = sag === null ? null : sag >= sagMin && sag <= sagMax;

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-foreground">{run.title || `Run ${run.id}`}</td>
      <td className="px-3 py-2">
        <SagCell value={sag} type={isFork ? 'front' : 'rear'} />
      </td>
      <td className="px-3 py-2 text-foreground">{isFork ? metrics.frontCompression : metrics.rearCompression}</td>
      <td className="px-3 py-2 text-foreground">{isFork ? metrics.frontRebound : metrics.rearRebound}</td>
      <td className="px-3 py-2">
        <BottomOutCell
          count={isFork ? metrics.frontBottomOutCount : metrics.rearBottomOutCount}
          maxTravel={isFork ? metrics.frontMaxTravel : metrics.rearMaxTravel}
          sagInRange={sagInRange}
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
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">Bottom Outs</th>
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
