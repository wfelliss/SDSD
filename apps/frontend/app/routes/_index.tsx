import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { cn } from "app/lib/utils";
import { CheckIcon } from "lucide-react";
import { useState, useEffect } from "react";

// ---------- Types ----------
type RunItem = {
  id: number;
  title: string | null;
  srcPath: string;
  date?: string;
  location?: string;
  length?: number;
};

type RunJson = Record<string, any>;

// ---------- Loader ----------
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

// ---------- Main Component ----------
export default function Runs() {
  const { runs } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState<RunItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingJson, setLoadingJson] = useState(false);

  const toggleRun = (run: RunItem) => {
    if (!sidebarOpen) return;

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
  }, [selected]);

  return (
    <div className="flex h-screen">
      <Sidebar runs={runs} selected={selected} setSelected={setSelected} />
      {/* Main content */}
      <MainContent
        selected={selected}
        jsonData={jsonData}
        loadingJson={loadingJson}
        isCompareMode={isCompareMode}
      />
      
    </div>
  );
}
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
  return (
    <div className="flex-1 p-6 overflow-auto">
        {selected.length === 0 ? (
          <p className="text-gray-500">Select a run from the sidebar to see details.</p>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {isCompareMode ? "Compare Mode" : "Single Run Mode"}
            </h2>

            <ul className="list-disc ml-6 space-y-1 mb-6">
              {selected.map((r) => (
                <li key={r.id}>
                  <span className="font-semibold">{r.title ?? "Untitled Run"}</span>
                  {r.date && <span className="ml-2 text-gray-500">({r.date})</span>}
                  {r.location && <span className="ml-2 text-gray-400">{r.location}</span>}
                  {r.length !== undefined && (
                    <span className="ml-2 text-gray-400">[{r.length}]</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="bg-gray-50 p-4 rounded border">
              {loadingJson ? (
                <p>Loading JSON...</p>
              ) : (
                selected.map((r) => (
                  <div key={r.id} className="mb-4">
                    <h3 className="font-semibold mb-1">
                      {r.title ?? "Untitled Run"} JSON
                    </h3>
                    <pre className="text-sm overflow-auto bg-white p-2 rounded border">
                      {jsonData[r.id]
                        ? JSON.stringify(jsonData[r.id], null, 2)
                        : "No JSON available"}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
  )
}


interface SidebarProps {
  runs: RunItem[];
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}


function Sidebar({ runs, selected, setSelected }: SidebarProps) {
  return <div className="w-64 h-svh p-4 flex flex-col gap-4 bg-slate-50 border-r border-slate-100 text-slate-800">
    <div className="flex flex-col gap-1">
      <h1 className="font-semibold text-xl text-slate-700">Select runs to compare</h1>
      <h2 className="text-">You can compare up to 2 runs</h2>
    </div>
    <ul className="flex flex-col">
      {runs.map((run) => <SidebarMenuButton key={run.id} run={run} selected={selected} setSelected={setSelected} />)}
    </ul>
  </div>
}

interface SidebarMenuButtonProps {
  run: RunItem;
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}

function SidebarMenuButton({ run, selected, setSelected }: SidebarMenuButtonProps) {
  
  const isSelected = selected.some(r => r.id === run.id);
  
  const toggle = () => {
    if (isSelected) {
      setSelected(selected.filter(r => r.id !== run.id));
    } else if (selected.length < 2) {
      setSelected([...selected, run]);
    }
  }

  return <button className="w-full rounded-md group hover:bg-slate-100 flex justify-between items-center p-2 cursor-pointer" onClick={toggle}>
    <div className="flex items-center gap-2">
      <div className={cn("size-4 border-indigo-700 border-2 rounded group-hover:border-indigo-600", isSelected && "bg-indigo-700")}>
        {isSelected && <CheckIcon className="size-full text-white" strokeWidth={4} />}
      </div>
      <span className="text-sm">{run.title}</span>
    </div>
    <span className="text-sm font-light">
      {run?.date && new Date(run.date).toLocaleDateString()}
    </span>
  </button>
}