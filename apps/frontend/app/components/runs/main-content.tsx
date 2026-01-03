import { RunItem, RunJson } from "app/types/runs";
import { DisplacementSection, HistogramSection } from "app/components/runs/chart-sections";
import { EmptyState, LoadingState, SectionDivider } from "app/components/ui/run-elements";

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
                  {'\n'}
                  {" Please check the backend server and S3 storage are running and connected."}
                </li>
              ))}
            </ul>
          </div>
        )}
        {fetchErrors.length === 0 && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {isCompareMode ? "Run Comparison" : selected[0]?.title || "Run Details"}
              </h1>
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