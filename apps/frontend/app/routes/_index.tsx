// apps/frontend/app/routes/_index.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";

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
export default function Runs() {
  const { runs } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState<RunItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingJson, setLoadingJson] = useState(false);

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
            className="p-1 rounded hover:bg-gray-200"
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? "⮜" : "⮞"}
          </button>
        </div>

        {sidebarOpen && (
          <ul className="mt-2 space-y-2">
            {runs.map((run) => {
              const selectedState = selected.some((r) => r.id === run.id);
              return (
                <li key={run.id}>
                  <button
                    onClick={() => toggleRun(run)}
                    className={`flex items-center px-3 py-2 rounded w-full text-left transition ${
                      selectedState
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-200 text-gray-800"
                    }`}
                    title={run.title ?? "Untitled Run"}
                  >
                    {run.title ?? "Untitled Run"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Main content */}
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

            {/* JSON display */}
            <div className="bg-gray-50 p-4 rounded border">
              {loadingJson ? (
                <p>Loading JSON...</p>
              ) : (
                selected.map((r) => (
                  <div key={r.id} className="mb-4">
                    <h3 className="font-semibold mb-1">{r.title ?? "Untitled Run"} JSON</h3>
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
    </div>
  );
}
