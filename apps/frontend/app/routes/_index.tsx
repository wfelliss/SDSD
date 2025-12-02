// apps/frontend/app/routes/_index.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { DisplacementPlot } from "../components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "../components/graphs/domain/TravelHistogram";

type RunItem = {
  id: number;
  title: string | null;
  srcPath: string;
  date?: string;
  location?: string;
  length?: number;
};

type RunJson = Record<string, any>; // generic JSON object

// ---------------------- LOADER ----------------------
export const loader = async () => {
  const backendURL =
    process.env.BACKEND_URL || "http://localhost:3001/api/runs/";

  const res = await fetch(backendURL);
  if (!res.ok) {
    throw new Response("Failed to fetch runs", { status: res.status });
  }

  const runs: RunItem[] = await res.json();
  return json({ runs });
};

// ---------------------- COMPONENT ----------------------
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-foreground mb-6">{children}</h2>
);

const SectionDivider = () => <div className="border-t border-border my-10" />;

// ---------------------- MAIN COMPONENT ----------------------
export default function Runs() {
  const { runs } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState<RunItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingJson, setLoadingJson] = useState(false);

  // Toggle Logic
  const toggleRun = (run: RunItem) => {
    if (!sidebarOpen) return; // do nothing if sidebar is closed
    const exists = selected.some((r) => r.id === run.id);

    if (exists) {
      setSelected(selected.filter((r) => r.id !== run.id));
      setJsonData((prev) => {
        const copy = { ...prev };
        delete copy[run.id];
        return copy;
      });
    } else if (selected.length < 2) {
      setSelected([...selected, run]);
    }
  };

  const isCompareMode = selected.length > 1;

  // Fetch JSON for selected runs
  useEffect(() => {
    const fetchJson = async (run: RunItem) => {
      setLoadingJson(true);
      try {
        const res = await fetch(
          `http://localhost:3001/api/s3/file?path=${encodeURIComponent(run.srcPath)}`
        );
        if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
        const data = await res.json();
        setJsonData((prev) => ({ ...prev, [run.id]: data }));
      } catch (err) {
        console.error(err);
        setJsonData((prev) => ({ ...prev, [run.id]: { error: (err as Error).message } }));
      } finally {
        setLoadingJson(false);
      }
    };

    selected.forEach((run) => {
      if (!jsonData[run.id]) {
        fetchJson(run);
      }
    });
  }, [selected]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={`bg-gray-100 border-r transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen && <h2 className="font-bold">Available Runs</h2>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? "⮜" : "⮞"}
          </button>
        </div>

        {sidebarOpen && (
          <ul className="mt-2 space-y-2 p-2">
            {runs.map((run) => {
              const isSelected = selected.some((r) => r.id === run.id);
              return (
                <li key={run.id}>
                  <button
                    onClick={() => toggleRun(run)}
                    className={`flex items-center px-3 py-2 rounded-md w-full text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {run.title ?? "Untitled Run"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        
        {/* Empty State */}
        {selected.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-32 text-muted-foreground">
             <span className="font-medium text-lg">Select a run to start</span>
             <span className="text-sm opacity-70">Choose from the sidebar</span>
          </div>
        )}
        
        {/* Loading State */}
        {loadingJson && (
          <div className="flex items-center justify-center mt-32 text-muted-foreground animate-pulse">
            Loading telemetry data...
          </div>
        )}

        {!loadingJson && selected.length > 0 && (
          <div className="w-full pb-20">
            
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {isCompareMode ? "Run Comparison" : (selected[0].title || "Run Details")}
              </h1>
            </div>

            {/* DISPLACEMENT PLOT */}
            <section>
              <SectionHeader>Displacement Plot</SectionHeader>

              {/* --- Compare runs mode --- */}
              {isCompareMode ? (
                <div className="grid grid-cols-1 gap-6 w-full">
                  
                  {/* Plot 1: Front Fork Comparison */}
                  <DisplacementPlot
                    title="Front Fork Comparison"
                    dynamicSag={{
                      front: jsonData[selected[0].id]?.data.suspension.front_sus,
                      rear: jsonData[selected[1].id]?.data.suspension.front_sus
                    }}
                    series={selected.map((run, i) => {
                      const data = jsonData[run.id];
                      if (!data || data.error) return { label: "Loading...", rawData: [], freq: 1 };
                      return {
                        label: run.title || `Run ${run.id}`,
                        color: i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
                        rawData: data.data.suspension.front_sus,
                        freq: Number(data.metadata.sample_frequency?.front_sus || 1)
                      };
                    })}
                  />

                  {/* Plot 2: Rear Shock Comparison */}
                  <DisplacementPlot
                    title="Rear Shock Comparison"
                    dynamicSag={{
                      front: jsonData[selected[0].id]?.data.suspension.rear_sus,
                      rear: jsonData[selected[1].id]?.data.suspension.rear_sus
                    }}
                    series={selected.map((run, i) => {
                      const data = jsonData[run.id];
                      if (!data || data.error) return { label: "Loading...", rawData: [], freq: 1 };
                      return {
                        label: run.title || `Run ${run.id}`,
                        color: i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
                        rawData: data.data.suspension.rear_sus,
                        freq: Number(data.metadata.sample_frequency?.rear_sus || 1)
                      };
                    })}
                  />
                </div>
              ) : (
                /* --- Single Run Mode --- */
                jsonData[selected[0].id] && !jsonData[selected[0].id].error && (
                  <DisplacementPlot
                    title="Suspension Displacement"
                    dynamicSag={{
                      front: jsonData[selected[0].id].data.suspension.front_sus,
                      rear: jsonData[selected[0].id].data.suspension.rear_sus
                    }}
                    series={[
                      {
                        label: "Front Fork",
                        color: "hsl(var(--chart-1))",
                        rawData: jsonData[selected[0].id].data.suspension.front_sus,
                        freq: Number(jsonData[selected[0].id].metadata.sample_frequency?.front_sus || 1)
                      },
                      {
                        label: "Rear Shock",
                        color: "hsl(var(--chart-2))",
                        rawData: jsonData[selected[0].id].data.suspension.rear_sus,
                        freq: Number(jsonData[selected[0].id].metadata.sample_frequency?.rear_sus || 1)
                      }
                    ]}
                  />
                )
              )}
            </section>

            <SectionDivider />

            {/* HISTOGRAM PLOT */}
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
                      : (i === 0 ? "fill-chart-1" : "fill-chart-2");
                    
                    const colorHover = !isCompareMode 
                      ? "fill-chart-2-hover" 
                      : (i === 0 ? "fill-chart-1-hover" : "fill-chart-2-hover");

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

          </div>
        )}
      </main>
    </div>
  );
}