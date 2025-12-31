import { RunItem, RunJson } from "app/types/runs";
import { DisplacementPlot, SeriesConfig } from "app/components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "app/components/graphs/domain/TravelHistogram";
import { SectionHeader } from "app/components/ui/run-elements";
interface ChartSectionProps {
  selected: RunItem[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

// ---------------------- Chart Data Formatter ----------------------
function getSeriesConfig(
  run: RunItem,
  index: number,
  jsonData: Record<number, RunJson>,
  type: 'front' | 'rear',
  customLabel?: string
): SeriesConfig {
  const data = jsonData[run.id];
  const isError = !data || data.error;
  const rawData = isError ? [] : (type === 'front' ? data.data.suspension.front_sus : data.data.suspension.rear_sus);
  const freq = isError ? 100 : (type === 'front' ? (run.front_freq || 100) : (run.rear_freq || 100));

  return {
    label: customLabel || run.title || `Run ${run.id}`,
    color: index === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
    rawData,
    freq
  };
}

// ---------------------- Displacement Plot ----------------------
export function DisplacementSection({ selected, jsonData, isCompareMode }: ChartSectionProps) {
  if (!selected || selected.length === 0) {
    return <SectionHeader>No run selected</SectionHeader>;
  }

  const first = selected[0];
  const second = selected[1] || null;
  const firstData = jsonData[first.id];
  const secondData = second ? jsonData[second.id] : null;

  return (
    <section>
      <SectionHeader>Displacement Plot</SectionHeader>

      {isCompareMode ? ( // Compare mode
        <div className="grid grid-cols-1 gap-6 w-full">
          <DisplacementPlot
            title="Front Fork Comparison"
            dynamicSag={{
              front: firstData?.data?.suspension?.front_sus,
              rear: secondData?.data?.suspension?.front_sus,
            }}
            series={selected.map((run, i) => getSeriesConfig(run, i, jsonData, 'front'))}
          />
          <DisplacementPlot
            title="Rear Shock Comparison"
            dynamicSag={{
              front: firstData?.data?.suspension?.rear_sus,
              rear: secondData?.data?.suspension?.rear_sus,
            }}
            series={selected.map((run, i) => getSeriesConfig(run, i, jsonData, 'rear'))}
          />
        </div>
      ) : ( // Single mode
        firstData && !firstData.error && (
          <DisplacementPlot
            title="Suspension Displacement"
            dynamicSag={{
              front: firstData.data.suspension.front_sus,
              rear: firstData.data.suspension.rear_sus,
            }}
            series={[
              getSeriesConfig(first, 0, jsonData, 'front', "Front Fork"),
              getSeriesConfig(first, 1, jsonData, 'rear', "Rear Shock")
            ]}
          />
        )
      )}
    </section>
  );
}

// ---------------------- Histogram Plot ----------------------
export function HistogramSection({ selected, jsonData, isCompareMode }: ChartSectionProps) {
  
  const renderHistogram = (run: RunItem, index: number, type: 'front' | 'rear') => {
    const data = jsonData[run.id];
    if (!data || data.error) return null;

    // Data
    const rawData = type === 'front' ? data.data.suspension.front_sus : data.data.suspension.rear_sus;
    
    // Color
    const isChart2 = isCompareMode ? index === 1 : type === 'rear';
    const colorVar = isChart2 ? "chart-2" : "chart-1";

    return (
      <TravelHistogram
        key={`${type}-${run.id}`}
        title={isCompareMode ? `${type === 'front' ? 'Front' : 'Rear'}: ${run.title}` : `${type === 'front' ? 'Front' : 'Rear'} Travel`}
        rawData={rawData}
        colorClass={`fill-${colorVar}`}
        hoverColorClass={`fill-${colorVar}-hover`}
      />
    );
  };

  return (
    <section>
      <SectionHeader>Travel Histogram</SectionHeader>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        <div className="space-y-4">
          {selected.map((run, i) => renderHistogram(run, i, 'front'))}
        </div>
        <div className="space-y-4">
          {selected.map((run, i) => renderHistogram(run, i, 'rear'))}
        </div>
      </div>
    </section>
  );
}
