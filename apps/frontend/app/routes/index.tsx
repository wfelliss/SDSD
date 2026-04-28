import { redirect, useLoaderData } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "../components/runs/sidebar";
import { MainContent } from "app/components/runs/main-content";
import { RunJson } from "app/types/runs";
import { getFile } from "app/api/s3";
import { getRuns } from "app/api/runs";
import { Run } from "@repo/database";
import { getCurrentUser } from "app/api/auth";

// ---------- Client-side loader ----------
// Must be clientLoader (not loader) because this app runs in React Router v7 SSR
// framework mode — regular loaders execute on the server where localStorage does
// not exist. clientLoader always runs in the browser, so localStorage and the
// Vite /api proxy are both available.
export const clientLoader = async () => {
  // Auth check — redirect to /login if no token or token is rejected
  try {
    await getCurrentUser();
  } catch {
    throw redirect("/login");
  }

  const runs = await getRuns();
  return { runs: runs.data || [] };
};
// Run this loader during initial hydration too so the page never renders
// with stale/empty SSR data.
clientLoader.hydrate = true as const;

// ---------------------- MAIN PAGE COMPONENT ----------------------
export default function Runs() {
  const { runs: initialRuns } = useLoaderData<typeof clientLoader>();
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingRuns, setLoadingRuns] = useState<Set<number>>(new Set());

  const runsById = useMemo(
    () => new Map(runs.map((run) => [run.id, run])),
    [runs],
  );
  const selected = useMemo(
    () => selectedRunIds.map((id) => runsById.get(id)).filter((run): run is Run => Boolean(run)),
    [selectedRunIds, runsById],
  );
  const isCompareMode = selected.length > 1;
  const loadingJson = loadingRuns.size > 0;

  useEffect(() => {
    const selectedIdSet = new Set(selectedRunIds);
    setJsonData((prev) => {
      const nextEntries = Object.entries(prev).filter(([id]) => selectedIdSet.has(Number(id)));
      return Object.fromEntries(nextEntries);
    });
  }, [selectedRunIds]);

  // Auth check is handled in the loader above — no need to repeat it here.

  // ----------------- Fetch JSON for selected runs -----------------
  useEffect(() => {
    const fetchJson = async (run: Run) => {
      // Check if already loading or already fetched (double-check inside async)
      if (loadingRuns.has(run.id) || jsonData[run.id]) {
        return;
      }

      setLoadingRuns((prev) => new Set(prev).add(run.id));
      try {
        const files = await getFile(run.srcPath);
        if (!files) throw new Error(`Failed to fetch file: ${run.srcPath}`);
        setJsonData((prev) => ({ ...prev, [run.id]: files.data }));
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
      if (!jsonData[run.id] && !loadingRuns.has(run.id)) {
        fetchJson(run);
      }
    });
  }, [selected, jsonData, loadingRuns]);

  return (
    <div className="flex h-screen">
      <Sidebar runs={runs} selectedRunIds={selectedRunIds} setSelectedRunIds={setSelectedRunIds} />
      <MainContent
        selected={selected.map((s) => runs.find((r) => r.id === s.id) || s)}
        jsonData={jsonData}
        loadingJson={loadingJson}
        isCompareMode={isCompareMode}
        onRunUpdate={(id, updates) => {
          setRuns((prevRuns) =>
            prevRuns.map((r) => (r.id === id ? { ...r, ...updates } : r))
          );
        }}
      />
    </div>
  );
}