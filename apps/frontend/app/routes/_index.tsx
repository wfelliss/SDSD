import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { cn } from "app/lib/utils";
import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
// @ts-ignore
import { DateRange } from "react-date-range";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import { DisplacementPlot } from "../components/graphs/domain/DisplacementPlot";
import { TravelHistogram } from "../components/graphs/domain/TravelHistogram";
import { requireUser } from "../helpers/session";

/* ===================== TYPES ===================== */
type RunItem = {
  id: number;
  title: string | null;
  srcPath: string;
  date?: string;
  location?: string;
  length?: number;
};

type RunJson = Record<string, any>;

interface ChartSectionProps {
  selected: RunItem[];
  jsonData: Record<number, RunJson>;
  isCompareMode: boolean;
}

/* ===================== LOADER ===================== */
export const loader = async ({ request }: { request: Request }) => {
  await requireUser(request);

  const backendURL =
    process.env.BACKEND_URL || "http://localhost:3001/api/runs/";

  const res = await fetch(backendURL, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Response("Failed to fetch runs", { status: res.status });
  }

  const runs: RunItem[] = await res.json();
  return json({ runs });
};

/* ===================== UI HELPERS ===================== */
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold mb-6">{children}</h2>
);

const SectionDivider = () => <div className="border-t my-10" />;

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center mt-32 text-muted-foreground">
    <span className="font-medium text-lg">Select a run to start</span>
    <span className="text-sm opacity-70">Choose from the sidebar</span>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center mt-32 animate-pulse">
    Loading telemetry data…
  </div>
);

/* ===================== PAGE ===================== */
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
        const res = await fetch(
          `http://localhost:3001/api/s3/file?path=${encodeURIComponent(
            run.srcPath
          )}`
        );
        const data = await res.json();
        setJsonData((prev) => ({ ...prev, [run.id]: data }));
      } catch (err) {
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

/* ===================== SIDEBAR ===================== */
interface SidebarProps {
  runs: RunItem[];
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}

function Sidebar({ runs, selected, setSelected }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [range, setRange] = useState([
    { startDate: new Date(2024,0,1), endDate: new Date(), key: "selection" },
  ]);

  const filteredRuns = runs.filter((run) => {
    const matchesQuery =
      !query || run.title?.toLowerCase().includes(query.toLowerCase());

    const matchesDate =
      !run.date ||
      (new Date(run.date) >= range[0].startDate &&
        new Date(run.date) <= range[0].endDate);

    return matchesQuery && matchesDate;
  });

  return (
    <aside className="w-64 h-svh p-4 bg-slate-50 border-r flex flex-col gap-2">
      <div>
        <h1 className="font-semibold text-xl">Select runs</h1>
        <p className="text-sm text-slate-500">Compare up to 2</p>
      </div>

      <input
        type="search"
        placeholder="Search runs…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="px-3 py-2 rounded border"
      />

      <button
        onClick={() => setDatePickerOpen((v) => !v)}
        className="px-3 py-2 border rounded"
      >
        {datePickerOpen ? "Close dates" : "Filter by date"}
      </button>

      {datePickerOpen && (
          <div className="scale-70 origin-top-left -mb-22">

        <DateRange
          ranges={range}
          onChange={(item: any) => setRange([item.selection])}
          moveRangeOnFirstSelection={false}
        />
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {filteredRuns.map((run) => (
          <SidebarMenuButton
            key={run.id}
            run={run}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </aside>
  );
}

function SidebarMenuButton({
  run,
  selected,
  setSelected,
}: {
  run: RunItem;
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}) {
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
      onClick={toggle}
      className={cn(
        "flex justify-between items-center p-2 rounded hover:bg-slate-100",
        isSelected && "bg-indigo-600 text-white"
      )}
    >
      <span className="text-sm">{run.title ?? "Untitled Run"}</span>
      <CheckIcon className={cn("size-4", !isSelected && "opacity-0")} />
    </button>
  );
}

/* ===================== CHART SECTIONS ===================== */
function DisplacementSection({
  selected,
  jsonData,
  isCompareMode,
}: ChartSectionProps) {
  const getRunData = (id: number) => jsonData[id];

  return (
    <section>
      <SectionHeader>Displacement Plot</SectionHeader>

      {isCompareMode ? (
        <div className="grid gap-6">
          <DisplacementPlot
            title="Front Fork Comparison"
            series={selected.map((run) => {
              const data = getRunData(run.id);
              if (!data || data.error)
                return { label: "Loading", rawData: [], freq: 1 };

              return {
                label: run.title ?? "",
                rawData: data.data.suspension.front_sus,
                freq: Number(
                  data.metadata.sample_frequency?.front_sus || 1
                ),
              };
            })}
          />

          <DisplacementPlot
            title="Rear Shock Comparison"
            series={selected.map((run) => {
              const data = getRunData(run.id);
              if (!data || data.error)
                return { label: "Loading", rawData: [], freq: 1 };

              return {
                label: run.title ?? "",
                rawData: data.data.suspension.rear_sus,
                freq: Number(
                  data.metadata.sample_frequency?.rear_sus || 1
                ),
              };
            })}
          />
        </div>
      ) : (
        jsonData[selected[0].id] && (
          <DisplacementPlot
            title="Suspension Displacement"
            series={[
              {
                label: "Front",
                rawData:
                  jsonData[selected[0].id].data.suspension.front_sus,
                freq: Number(
                  jsonData[selected[0].id].metadata.sample_frequency
                    ?.front_sus || 1
                ),
              },
              {
                label: "Rear",
                rawData:
                  jsonData[selected[0].id].data.suspension.rear_sus,
                freq: Number(
                  jsonData[selected[0].id].metadata.sample_frequency
                    ?.rear_sus || 1
                ),
              },
            ]}
          />
        )
      )}
    </section>
  );
}

function HistogramSection({
  selected,
  jsonData,
  isCompareMode,
}: ChartSectionProps) {
  return (
    <section>
      <SectionHeader>Travel Histogram</SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {selected.map((run, i) => {
          const data = jsonData[run.id];
          if (!data || data.error) return null;

          return (
            <TravelHistogram
              key={run.id}
              title={isCompareMode ? run.title ?? "" : "Travel"}
              rawData={data.data.suspension.front_sus}
              colorClass={i === 0 ? "fill-chart-1" : "fill-chart-2"}
              hoverColorClass={
                i === 0 ? "fill-chart-1-hover" : "fill-chart-2-hover"
              }
            />
          );
        })}
      </div>
    </section>
  );
}

/* ===================== MAIN CONTENT ===================== */
function MainContent({
  selected,
  jsonData,
  loadingJson,
  isCompareMode,
}: {
  selected: RunItem[];
  jsonData: Record<number, RunJson>;
  loadingJson: boolean;
  isCompareMode: boolean;
}) {
  if (selected.length === 0) {
    return (
      <main className="flex-1 p-8">
        <EmptyState />
      </main>
    );
  }

  if (loadingJson) {
    return (
      <main className="flex-1 p-8">
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-8">
        {isCompareMode ? "Run Comparison" : selected[0].title}
      </h1>

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
    </main>
  );
}
