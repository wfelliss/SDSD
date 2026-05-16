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

function getComponentRecommendations(
  sag: number | null,
  sagMin: number,
  sagMax: number,
  sagInRange: boolean | null,
  bottomOutCount: number | null,
  maxTravel: number | null,
): string[] {
  const items: string[] = [];

  if (sag !== null) {
    if (sag < sagMin) items.push(`Reduce pressure (sag too low: ${sag.toFixed(1)}%)`);
    else if (sag > sagMax) items.push(`Increase pressure (sag too high: ${sag.toFixed(1)}%)`);
  }

  if (bottomOutCount !== null) {
    const sagWarning = sagInRange === false ? 'Sag not in range — suggestions may be inaccurate. ' : '';
    if (bottomOutCount > BOTTOM_OUT_COUNT_THRESHOLD) {
      items.push(`${sagWarning}Add a volume spacer (${bottomOutCount} bottom-outs)`);
    } else if (bottomOutCount === 0 && maxTravel !== null && maxTravel < BOTTOM_OUT_TRAVEL_MIN) {
      items.push(`${sagWarning}Remove volume spacer (never reached travel)`);
    }
  }

  return items;
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

  if (count > BOTTOM_OUT_COUNT_THRESHOLD) {
    tooltip = 'Add a volume spacer';
    color = 'bg-red-100 text-red-800';
  } else if (count === 0 && maxTravel !== null && maxTravel < BOTTOM_OUT_TRAVEL_MIN) {
    tooltip = 'Remove volume spacer';
    color = 'bg-red-100 text-red-800';
  } else {
    tooltip = 'Correct volume spacers';
    color = 'bg-green-100 text-green-800';
  }

  if (sagInRange === false) {
    tooltip = `Sag is not in range, suggestions may be inaccurate.\n${tooltip}`;
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

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-foreground">{run.title || `Run ${run.id}`}</td>
      <td className="px-3 py-2 border-l border-border">
        <SagCell value={metrics.frontSag} type="front" />
      </td>
      <td className="px-3 py-2 text-foreground">{metrics.frontCompression}</td>
      <td className="px-3 py-2 text-foreground">{metrics.frontRebound}</td>
      <td className="px-3 py-2">
        <BottomOutCell count={metrics.frontBottomOutCount} maxTravel={metrics.frontMaxTravel} sagInRange={metrics.frontSagInRange} />
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
        <BottomOutCell count={metrics.rearBottomOutCount} maxTravel={metrics.rearMaxTravel} sagInRange={metrics.rearSagInRange} />
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

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-foreground">{run.title || `Run ${run.id}`}</td>
      <td className="px-3 py-2">
        <SagCell value={isFork ? metrics.frontSag : metrics.rearSag} type={isFork ? 'front' : 'rear'} />
      </td>
      <td className="px-3 py-2 text-foreground">{isFork ? metrics.frontCompression : metrics.rearCompression}</td>
      <td className="px-3 py-2 text-foreground">{isFork ? metrics.frontRebound : metrics.rearRebound}</td>
      <td className="px-3 py-2">
        <BottomOutCell
          count={isFork ? metrics.frontBottomOutCount : metrics.rearBottomOutCount}
          maxTravel={isFork ? metrics.frontMaxTravel : metrics.rearMaxTravel}
          sagInRange={isFork ? metrics.frontSagInRange : metrics.rearSagInRange}
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

interface RunRecommendationsBlockProps {
  run: Run;
  jsonData: Record<number, RunJson>;
}

function ComponentRecommendationList({ items }: { items: string[] }) {
  const display = items.length > 0 ? items : ['No issues detected.'];
  return (
    <ul className="space-y-0.5">
      {display.map((item, i) => (
        <li key={i} className="text-sm text-text-secondary flex gap-2">
          <span className="text-muted-foreground select-none">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function RunRecommendationsBlock({ run, jsonData }: RunRecommendationsBlockProps) {
  const metrics = useRunMetrics(run, jsonData);
  const title = run.title || `Run ${run.id}`;

  const forkItems = getComponentRecommendations(
    metrics.frontSag, DYNAMIC_SAG_IDEAL_MIN_FRONT, DYNAMIC_SAG_IDEAL_MAX_FRONT,
    metrics.frontSagInRange, metrics.frontBottomOutCount, metrics.frontMaxTravel,
  );
  const shockItems = getComponentRecommendations(
    metrics.rearSag, DYNAMIC_SAG_IDEAL_MIN_REAR, DYNAMIC_SAG_IDEAL_MAX_REAR,
    metrics.rearSagInRange, metrics.rearBottomOutCount, metrics.rearMaxTravel,
  );

  return (
    <div className="rounded-md border border-border bg-white p-3">
      <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Fork</p>
          <ComponentRecommendationList items={forkItems} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Shock</p>
          <ComponentRecommendationList items={shockItems} />
        </div>
      </div>
    </div>
  );
}

interface RecommendationsSummaryProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
}

function RecommendationsSummary({ selected, jsonData }: RecommendationsSummaryProps) {
  if (selected.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-foreground mb-2">Recommendations</p>
      <div className="flex flex-col gap-2">
        {selected.map((run) => (
          <RunRecommendationsBlock key={run.id} run={run} jsonData={jsonData} />
        ))}
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
      <RecommendationsSummary selected={selected} jsonData={jsonData} />
    </section>
  );
}
