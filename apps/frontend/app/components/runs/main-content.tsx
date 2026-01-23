import { RunJson } from "app/types/runs";
import {
  DisplacementSection,
  HistogramSection,
} from "app/components/runs/chart-sections";
import {
  EmptyState,
  LoadingState,
  SectionDivider,
} from "app/components/ui/run-elements"; 
import { Run } from "@repo/database";
import { useState } from "react";
import { ProfilePopup } from "../profiles/profilePopUp";
import { UserIcon } from "lucide-react";
import { useOptimisticRuns } from "app/hooks/useOptimisticRuns"; 

interface MainContentProps {
  selected: Run[];
  jsonData: Record<number, RunJson>;
  loadingJson: boolean;
  isCompareMode: boolean;
}

export function MainContent({
  selected: initialSelected,
  jsonData,
  loadingJson,
  isCompareMode,
}: MainContentProps) {
  
  const { runs, handleProfileUpdate } = useOptimisticRuns(initialSelected);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // 2. NOW you can do conditional returns
  if (initialSelected.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <EmptyState />
      </main>
    );
  }

  const fetchErrors = runs
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
        {fetchErrors.length > 0 && (
          <div
            role="alert"
            className="mb-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700"
          >
            <strong className="block font-medium">
              Error loading run data
            </strong>
            <ul className="mt-2 list-disc list-inside">
              {fetchErrors.map((e) => (
                <li key={e.id}>
                  {e.title ? `${e.title}: ` : `Run ${e.id}: `}
                  {e.message}
                  {"\n"}
                  { " Please check the backend server and S3 storage are running and connected." }
                </li>
              ))}
            </ul>
          </div>
        )}
        {fetchErrors.length === 0 && (
          <>
            {isPopupOpen && (
              <ProfilePopup
                isOpen={isPopupOpen}
                onClose={() => setIsPopupOpen(false)}
                selected={runs} 
                onProfileUpdate={handleProfileUpdate}
              />
            )}
            <div className="w-full flex justify-between mb-8" >
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground w-fit">
                {isCompareMode ? "Run Comparison" : runs[0]?.title || "Run Details"}
              </h1>
              <button 
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md" 
                onClick={() => setIsPopupOpen(true)}
              >
                <UserIcon className="size-5" />
              </button>
            </div>

            <DisplacementSection
              selected={runs}
              jsonData={jsonData}
              isCompareMode={isCompareMode}
            />

            <SectionDivider />

            <HistogramSection
              selected={runs}
              jsonData={jsonData}
              isCompareMode={isCompareMode}
            />
          </>
        )}
      </div>
    </main>
  );
}