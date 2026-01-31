import { RunJson } from "app/types/runs";
import { Run } from "@repo/database";
import { formatDate } from "app/lib/utils";
import { MessageSquareText } from "lucide-react";
import { extractFrequencyNumber } from "app/lib/utils";

interface RunsMetadataProps {
  runs: Run[];
  jsonData: Record<number, RunJson>;
  onOpenComments: (run: Run) => void;
}

export function RunsMetadata({ runs, jsonData, onOpenComments }: RunsMetadataProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {runs.map((run) => {
        const data = jsonData[run.id] || {};
        const metadata = data.metadata ?? data;
        const sampleFreq = metadata?.sample_frequency ?? null;

        const freqNum = extractFrequencyNumber(sampleFreq);

        const freqDisplay = freqNum ? `${freqNum} Hz` : "N/A";
        const lengthSeconds = freqNum && freqNum > 0 ? `${(run.length / freqNum).toFixed(2)} s` : "N/A";

        return (
          <div key={run.id} className="p-3 bg-slate-50 border border-slate-100 rounded-md">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-sm text-slate-700">
                {run.title || "Untitled"}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{formatDate(run.date)}</span>
                <button
                  title="Comments"
                  className="p-1 rounded hover:bg-slate-100"
                  onClick={() => onOpenComments(run)}
                >
                  <MessageSquareText className="size-4 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              <div><strong>Location:</strong> {run.location ?? "Unknown"}</div>
              <div><strong>Frequency:</strong> {freqDisplay}</div>
              <div><strong>Length:</strong> {lengthSeconds}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
