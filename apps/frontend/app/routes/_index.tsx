import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { cn } from "app/lib/utils";
import { CheckIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { DisplacementPlot } from "../components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "../components/graphs/domain/TravelHistogram";

// ---------- Types ----------
type RunItem = {
  id: number;
  title: string | null;
  srcPath: string;
  date?: string;
  location?: string;
  front_freq?: number;
  rear_freq?: number;
  length?: number;
};

type RunJson = Record<string, any>;

// ---------- Loader ----------
export const loader = async () => {
  const backendURL =
    // Use Vite env var exposed to the client build. Fallback to localhost for dev.
    (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:3001/api/runs/";

  const res = await fetch(backendURL);
  if (!res.ok) {
    throw new Response("Failed to fetch runs", { status: res.status });
  }

  const runs: RunItem[] = await res.json();
  return json({ runs });
};

// ---------------------- UI components ----------------------
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-foreground mb-6">{children}</h2>
);

const SectionDivider = () => <div className="border-t border-border my-10" />;

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center mt-32 text-muted-foreground">
    <span className="font-medium text-lg">Select a run to start</span>
    <span className="text-sm opacity-70">Choose from the sidebar</span>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center mt-32 text-muted-foreground animate-pulse">
    Loading telemetry data...
  </div>
);

// ---------------------- MAIN PAGE COMPONENT ----------------------
export default function Runs() {
  const { runs } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState<RunItem[]>([]);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingJson, setLoadingJson] = useState(false);

  const isCompareMode = selected.length > 1;

  useEffect(() => {
    const fetchJson = async (run: RunItem) => {
      setLoadingJson(true);
      try {
        const s3FileBase = (import.meta.env.VITE_S3_FILE_URL as string) ||
          "http://localhost:3001/api/s3/file";
        const res = await fetch(
          `${s3FileBase}?path=${encodeURIComponent(run.srcPath)}`
        );
        if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
        const data = await res.json();
        setJsonData((prev) => ({ ...prev, [run.id]: data }));
      } catch (err) {
        console.error(err);
        setJsonData((prev) => ({
          ...prev,
          [run.id]: { error: (err as Error).message },
        }));
      } finally {
        setLoadingJson(false);
      }
    };

    selected.forEach((run) => {
      if (!jsonData[run.id]) fetchJson(run);
    });
  }, [selected, jsonData]);

  return (
    <div className="flex h-screen">
      <Sidebar runs={runs} selected={selected} setSelected={setSelected} />
      <MainContent
        selected={selected}
        jsonData={jsonData}
        loadingJson={loadingJson}
        isCompareMode={isCompareMode}
      />
    </div>
  );
}

// ---------------------- SIDEBAR COMPONENTS ----------------------
interface SidebarProps {
  runs: RunItem[];
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}

function Sidebar({ runs, selected, setSelected }: SidebarProps) {
  return (
    <div className="w-64 h-svh p-4 flex flex-col gap-4 bg-slate-50 border-r border-slate-100 text-slate-800">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl text-slate-700">Select runs to compare</h1>
        <h2 className="text-sm text-slate-500">You can compare up to 2 runs</h2>
      </div>
      <ul className="flex flex-col">
        {runs.map((run) => (
          <SidebarMenuButton
            key={run.id}
            run={run}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

interface SidebarMenuButtonProps {
  run: RunItem;
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}

function SidebarMenuButton({ run, selected, setSelected }: SidebarMenuButtonProps) {
  const isSelected = selected.some((r) => r.id === run.id);

  const toggle = () => {
    if (isSelected) {
      setSelected(selected.filter((r) => r.id !== run.id));
    } else if (selected.length < 2) {
      setSelected([...selected, run]);
    }
  };

  return (
    <button
      className="w-full rounded-md group hover:bg-slate-100 flex justify-between items-center p-2 cursor-pointer"
      onClick={toggle}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-4 border-indigo-700 border-2 rounded group-hover:border-indigo-600",
            isSelected && "bg-indigo-700"
          )}
        >
          {isSelected && <CheckIcon className="size-full text-white" strokeWidth={4} />}
        </div>
        <span className="text-sm">{run.title}</span>
      </div>
      <span className="text-sm font-light">
        {run?.date && new Date(run.date).toLocaleDateString()}
      </span>
    </button>
  );
}

// ---------------------- CHART COMPONENTS ----------------------
interface ChartSectionProps {
  selected: RunItem[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

function DisplacementSection({ selected, jsonData, isCompareMode }: ChartSectionProps) {
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

function HistogramSection({ selected, jsonData, isCompareMode }: ChartSectionProps) {
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

// ---------------------- MAIN CONTENT WRAPPER ----------------------
interface MainContentProps {
  selected: RunItem[];
  jsonData: Record<number, RunJson>;
  loadingJson: boolean;
  isCompareMode: boolean;
}

function MainContent({
  selected,
  jsonData,
  loadingJson,
  isCompareMode,
}: MainContentProps) {
  if (selected.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <EmptyState />
      </main>
    );
  }

  // Collect any fetch errors for the currently selected runs.
  const fetchErrors = selected
    .map((run) => {
      const data = jsonData[run.id];
      if (data && data.error) {
        return { id: run.id, title: run.title, message: String(data.error) };
      }
      return null;
    })
    .filter(Boolean) as { id: number; title: string | null; message: string }[];

  if (loadingJson) {
    return (
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-8 bg-background">
      <div className="w-full pb-20">
        {/* Error banner for any fetch errors */}
        {fetchErrors.length > 0 && (
          <div
            role="alert"
            className="mb-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700"
          >
            <strong className="block font-medium">Error loading run data</strong>
            <ul className="mt-2 list-disc list-inside">
              {fetchErrors.map((e) => (
                <li key={e.id}>
                  {e.title ? `${e.title}: ` : `Run ${e.id}: `}
                  {e.message}
                  {'\n'}
                  {" Please check the backend server and S3 storage are running and connected."}
                </li>
              ))}
            </ul>
          </div>
        )}
        {fetchErrors.length === 0 && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {isCompareMode ? "Run Comparison" : selected[0]?.title || "Run Details"}
              </h1>
            </div>

            <DisplacementSection
              selected={selected}
              jsonData={jsonData}
              isCompareMode={isCompareMode}
            />

            <SectionDivider />

            <HistogramSection
              selected={selected}
              jsonData={jsonData}
              isCompareMode={isCompareMode}
            />
          </>
        )}


      </div>
    </main>
  );
}