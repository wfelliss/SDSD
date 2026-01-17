import { CheckIcon } from "lucide-react";
import { cn } from "app/lib/utils";
import { Run } from "@repo/database";

// ---------------------- SIDEBAR COMPONENTS ----------------------
interface SidebarProps {
  runs: Run[];
  selected: Run[];
  setSelected: (runs: Run[]) => void;
}

export function Sidebar({ runs, selected, setSelected }: SidebarProps) {
  return (
    <div className="w-64 h-svh p-4 flex flex-col gap-4 bg-slate-50 border-r border-slate-100 text-slate-800">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl text-slate-700">
          Select runs to compare
        </h1>
        <h2 className="text-sm text-slate-500">You can compare up to 2 runs</h2>
      </div>
      <ul className="flex flex-col">
        {runs.length === 0 ? (
          <li className="text-slate-500 text-sm border-orange-400 border-l-2 bg-orange-400/10 px-2 py-1 rounded-xs">
            No runs available - go ride your bike
          </li>
        ) : (
          runs.map((run) => (
            <SidebarMenuButton
              key={run.id}
              run={run}
              selected={selected}
              setSelected={setSelected}
            />
          ))
        )}
      </ul>
    </div>
  );
}

interface SidebarMenuButtonProps {
  run: Run;
  selected: Run[];
  setSelected: (runs: Run[]) => void;
}

function SidebarMenuButton({
  run,
  selected,
  setSelected,
}: SidebarMenuButtonProps) {
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
          {isSelected && (
            <CheckIcon className="size-full text-white" strokeWidth={4} />
          )}
        </div>
        <span className="text-sm">{displayTitle}</span>
      </div>
      <span className="text-sm font-light">
        {run?.date &&
          new Date(run.date).toLocaleDateString("en-GB", { timeZone: "UTC" })}
      </span>
    </button>
  );
}
