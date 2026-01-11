import { RunItem, RunJson } from "app/types/runs";
import { DisplacementSection, HistogramSection } from "app/components/runs/chart-sections";
import { EmptyState, LoadingState, SectionDivider } from "app/components/ui/run-elements"; 
import { useState } from "react";
import { ProfileRow } from "../profiles/profileRow";

interface MainContentProps {
  selected: RunItem[];
  jsonData: Record<number, RunJson>;
  loadingJson: boolean;
  isCompareMode: boolean;
}

export function MainContent({
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

  const [isPopupOpen, setIsPopupOpen] = useState(false);

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
                      {" Please check the backend server and S3 storage are running and connected."}
                </li>
              ))}
            </ul>
          </div>
        )}
        {fetchErrors.length === 0 && (
          <>
            {isPopupOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsPopupOpen(false)}
                />
                <div className="relative z-10 w-full max-w-lg rounded bg-white p-6">
                  <h2 className="mb-2 text-lg font-semibold">Profile</h2>
                  {selected[0]?.profile && <ProfileRow profile={selected[0]?.profile} />}
                  <div className="mt-4 text-right">
                    <button
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      onClick={() => setIsPopupOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="mb-8 flex-row" >
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {isCompareMode ? "Run Comparison" : selected[0]?.title || "Run Details"}
              </h1>
              <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md" onClick={() => setIsPopupOpen(true)}>Profile</button>
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