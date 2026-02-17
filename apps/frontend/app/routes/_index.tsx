import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { Sidebar } from "../components/runs/sidebar";
import { MainContent } from "app/components/runs/main-content";
import { RunItem, RunJson } from "app/types/runs";


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

// ---------------------- MAIN PAGE COMPONENT ----------------------
export default function Runs() {
  const { runs } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState<RunItem[]>([]);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingRuns, setLoadingRuns] = useState<Set<number>>(new Set());

  const isCompareMode = selected.length > 1;
  const loadingJson = loadingRuns.size > 0;

  useEffect(() => {
    const fetchJson = async (run: RunItem) => {
      setLoadingRuns((prev) => new Set([...prev, run.id]));
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
        setLoadingRuns((prev) => {
          const next = new Set(prev);
          next.delete(run.id);
          return next;
        });
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
