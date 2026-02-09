import { Run } from "@repo/database";
import { RunJson } from "app/types/runs";
import { SectionHeader } from "app/components/ui/run-elements";

interface SummarySectionProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

function calculateDynamicSag(run: Run, suspensionData: RunJson | undefined) {
  console.log("Calculating Dynamic Sag for run:", run.id);
  console.log("Run data:", run);
  console.log("Suspension data:", suspensionData);
  return 10;
}

function calculateCompression(_run: Run, _jsonData: Record<number, RunJson>) {
  return 0;
}

function calculateRebound(_run: Run, _jsonData: Record<number, RunJson>) {
  return 0;
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
              className="px-3 py-2 font-semibold text-foreground text-center"
              scope="col"
              colSpan={3}
            >
              Fork
            </th>
            <th
              className="px-3 py-2 font-semibold text-foreground text-center"
              scope="col"
              colSpan={3}
            >
              Shock
            </th>
          </tr>
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              &nbsp;
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Dynamic Sag
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Compression
            </th>
            <th className="px-3 py-2 font-semibold text-foreground" scope="col">
              Rebound
            </th>
          </tr>
        </thead>
        <tbody>
          {selected.map((run) => (
            <tr key={run.id} className="border-t border-border">
              <td className="px-3 py-2 text-foreground">
                {run.title || `Run ${run.id}`}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateDynamicSag(
                  run,
                  jsonData[run.id]?.data?.suspension?.front_sus,
                )}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateCompression(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateRebound(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateDynamicSag(
                  run,
                  jsonData[run.id]?.data?.suspension?.rear_sus,
                )}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateCompression(run, jsonData)}
              </td>
              <td className="px-3 py-2 text-foreground">
                {calculateRebound(run, jsonData)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
      <SummaryTable selected={selected} jsonData={jsonData} />
    </section>
  );
}
