import {RunItem, RunJson} from "app/types/runs";
import {CheckIcon} from "lucide-react";
import {cn} from "app/lib/utils";
import { useState } from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css"; // main style
import "react-date-range/dist/theme/default.css"; // theme



// ---------------------- SIDEBAR COMPONENTS ----------------------
interface SidebarProps {
  runs: RunItem[];
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}


export function Sidebar({ runs, selected, setSelected }: SidebarProps) {

  const [query, setQuery] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [range, setRange] = useState([
    { startDate: new Date(2024,0,1), endDate: new Date(), key: "selection" },
  ]);
  return (
    <div className="w-64 h-svh p-4 flex flex-col gap-4 bg-slate-50 border-r border-slate-100 text-slate-800">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl text-slate-700">Select runs to compare</h1>
        <h2 className="text-sm text-slate-500">You can compare up to 2 runs</h2>
      </div>
      <input
        type="search"
        placeholder="Search runs…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="px-3 py-2 rounded border"
      />

      <button
        onClick={() => setDatePickerOpen((v) => !v)}
        className="px-3 py-2 border rounded"
      >
        {datePickerOpen ? "Close dates" : "Filter by date"}
      </button>

      {datePickerOpen && (
          <div className="scale-70 origin-top-left -mb-22">

        <DateRange
          ranges={range}
          onChange={(item: any) => setRange([item.selection])}
          moveRangeOnFirstSelection={false}
        />
        </div>
      )}
      <ul className="flex flex-col">
      {runs
  .filter((run) => {
    const matchesQuery =
      !query || run.title?.toLowerCase().includes(query.toLowerCase());

    const matchesDate =
      !run.date ||
      (new Date(run.date) >= range[0].startDate &&
        new Date(run.date) <= range[0].endDate);

    return matchesQuery && matchesDate;
  })
        .map((run) => (
          <SidebarMenuButton
            key={run.id}
            run={run}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

interface SidebarMenuButtonProps {
  run: RunItem;
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}

function SidebarMenuButton({ run, selected, setSelected }: SidebarMenuButtonProps) {
  const isSelected = selected.some((r) => r.id === run.id);

  const displayTitle = run.title
    ? run.title.length > 14
      ? `${run.title.slice(0, 14)}...`
      : run.title
    : "";

  const toggle = () => {
    if (isSelected) {
      setSelected(selected.filter((r) => r.id !== run.id));
    } else if (selected.length < 2) {
      setSelected([...selected, run]);
    }
  };

  return (
    <button
      className="w-full rounded-md group hover:bg-slate-100 flex justify-between items-center p-2 cursor-pointer"
      onClick={toggle}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-4 border-indigo-700 border-2 rounded group-hover:border-indigo-600",
            isSelected && "bg-indigo-700"
          )}
        >
          {isSelected && <CheckIcon className="size-full text-white" strokeWidth={4} />}
        </div>
        <span className="text-sm">{displayTitle}</span>
      </div>
      <span className="text-sm font-light">
        {run?.date && new Date(run.date).toLocaleDateString("en-GB", {timeZone: 'UTC'})}
      </span>
    </button>
  );
}
