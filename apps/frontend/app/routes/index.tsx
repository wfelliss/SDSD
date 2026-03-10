import { useLoaderData, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sidebar } from "../components/runs/sidebar";
import { MainContent } from "app/components/runs/main-content";
import { RunJson } from "app/types/runs";
import { getFile } from "app/api/s3";
import { getRuns } from "app/api/runs";
import { Run } from "@repo/database";
import { getCurrentUser } from "app/api/auth";

// ---------- Loader ----------
export const loader = async () => {
  const runs = await getRuns();
  return { runs: runs.data || [] };
};

// ---------------------- MAIN PAGE COMPONENT ----------------------
export default function Runs() {
  const { runs } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<Run[]>([]);
  const [jsonData, setJsonData] = useState<Record<number, RunJson>>({});
  const [loadingJson, setLoadingJson] = useState(false);

  const isCompareMode = selected.length > 1;

  // ----------------- Auth check -----------------
  useEffect(() => {
    console.log("Checking auth…");
    async function checkAuth() {
      try {
        await getCurrentUser(); 
      } catch {
        navigate("/login");
      }
    }
    checkAuth();
  }, [navigate]);

  // ----------------- Fetch JSON for selected runs -----------------
  useEffect(() => {
    const fetchJson = async (run: Run) => {
      setLoadingJson(true);
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