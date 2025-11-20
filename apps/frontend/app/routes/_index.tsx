// apps/frontend/app/routes/runs.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";

type RunItem = {
  id: number;
  title: string | null;
  srcPath: string;
  date?: string;
  location?: string;
  length?: number;
};

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

  const toggleRun = (run: RunItem) => {
    if (!sidebarOpen) return; // do nothing if sidebar is closed
    // setSidebarOpen(false);
    const exists = selected.some((r) => r.id === run.id);

    if (exists) {
      setSelected(selected.filter((r) => r.id !== run.id));
    } else if (selected.length < 2) {
      setSelected([...selected, run]);
    }
  };

  const isCompareMode = selected.length > 1;

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

        <ul className="mt-2 space-y-2">
          {sidebarOpen &&
            runs.map((run) => {
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

            <ul className="list-disc ml-6 space-y-1">
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
          </div>
        )}
      </div>
    </div>
  );
}
