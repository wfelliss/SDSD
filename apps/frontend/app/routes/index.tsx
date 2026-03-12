import { useLoaderData } from "react-router-dom";
import { redirect } from "react-router";
import { useState, useEffect } from "react";
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
  const { runs } = useLoaderData<typeof clientLoader>();

  const [selected, setSelected] = useState<Run[]>([]);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingRuns, setLoadingRuns] = useState<Set<number>>(new Set());

  const isCompareMode = selected.length > 1;
  const loadingJson = loadingRuns.size > 0;

  // Auth check is handled in the loader above — no need to repeat it here.

  // ----------------- Fetch JSON for selected runs -----------------
  useEffect(() => {
    const fetchJson = async (run: Run) => {
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