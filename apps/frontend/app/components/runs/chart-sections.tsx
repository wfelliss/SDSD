import { RunItem, RunJson } from "app/types/runs";
import { DisplacementPlot } from "app/components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "app/components/graphs/domain/TravelHistogram";
import { SectionHeader } from "app/components/ui/run-elements";

// ---------------------- CHART COMPONENTS ----------------------
interface ChartSectionProps {
  selected: RunItem[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

export function DisplacementSection({ selected, jsonData, isCompareMode }: ChartSectionProps) {
  if (!selected || selected.length === 0) {
    return <SectionHeader>No run selected</SectionHeader>;
  }

  const first = selected[0] || null;            // Safe now
  const second = selected[1] || null;   // Could be null in single mode

  const firstData = first ? jsonData[first.id] : null; // Safe
  const secondData = second ? jsonData[second.id] : null;

  return (
    <section>
      <SectionHeader>Displacement Plot</SectionHeader>

      {isCompareMode ? (
        <div className="grid grid-cols-1 gap-6 w-full">

          {/* Plot 1: Front Fork Comparison */}
          <DisplacementPlot
            title="Front Fork Comparison"
            dynamicSag={{
              front: firstData?.data?.suspension?.front_sus,
              rear: secondData?.data?.suspension?.front_sus,
            }}
            series={selected.map((run, i) => {
              const data = jsonData[run.id];
              if (!data || data.error) {
                return { label: "Loading...", rawData: [], freq: 1, color: "" };
              }
              return {
                label: run.title || `Run ${run.id}`,
                color: i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
                rawData: data.data.suspension.front_sus,
                freq: run.front_freq || 100
              };
            })}
          />

          {/* Plot 2: Rear Shock Comparison */}
          <DisplacementPlot
            title="Rear Shock Comparison"
            dynamicSag={{
              front: firstData?.data?.suspension?.rear_sus,
              rear: secondData?.data?.suspension?.rear_sus,
            }}
            series={selected.map((run, i) => {
              const data = jsonData[run.id];
              if (!data || data.error) {
                return { label: "Loading...", rawData: [], freq: 1, color: "" };
              }
              return {
                label: run.title || `Run ${run.id}`,
                color: i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
                rawData: data.data.suspension.rear_sus,
                freq: run.rear_freq || 100
              };
            })}
          />

        </div>
      ) : (
        firstData && !firstData.error && (
          <DisplacementPlot
            title="Suspension Displacement"
            dynamicSag={{
              front: firstData.data.suspension.front_sus,
              rear: firstData.data.suspension.rear_sus,
            }}
            series={[
              {
                label: "Front Fork",
                color: "hsl(var(--chart-1))",
                rawData: firstData.data.suspension.front_sus,
                freq: first?.front_freq || 100
              },
              {
                label: "Rear Shock",
                color: "hsl(var(--chart-2))",
                rawData: firstData.data.suspension.rear_sus,
                freq: first?.rear_freq || 100
              },
            ]}
          />
        )
      )}
    </section>
  );
}

export function HistogramSection({ selected, jsonData, isCompareMode }: ChartSectionProps) {
  return (
    <section>
      <SectionHeader>Travel Histogram</SectionHeader>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Front Column */}
        <div className="space-y-4">
          {selected.map((run, i) => {
            const data = jsonData[run.id];
            if (!data || data.error) return null;

            return (
              <TravelHistogram
                key={`front-${run.id}`}
                title={isCompareMode ? `Front: ${run.title}` : "Front Travel"}
                rawData={data.data.suspension.front_sus}
                colorClass={i === 0 ? "fill-chart-1" : "fill-chart-2"}
                hoverColorClass={i === 0 ? "fill-chart-1-hover" : "fill-chart-2-hover"}
              />
            );
          })}
        </div>

        {/* Rear Column */}
        <div className="space-y-4">
          {selected.map((run, i) => {
            const data = jsonData[run.id];
            if (!data || data.error) return null;

            const colorFill = !isCompareMode
              ? "fill-chart-2"
              : i === 0
              ? "fill-chart-1"
              : "fill-chart-2";

            const colorHover = !isCompareMode
              ? "fill-chart-2-hover"
              : i === 0
              ? "fill-chart-1-hover"
              : "fill-chart-2-hover";

            return (
              <TravelHistogram
                key={`rear-${run.id}`}
                title={isCompareMode ? `Rear: ${run.title}` : "Rear Travel"}
                rawData={data.data.suspension.rear_sus}
                colorClass={colorFill}
                hoverColorClass={colorHover}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
