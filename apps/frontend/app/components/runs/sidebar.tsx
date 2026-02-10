import { Run } from "@repo/database";
import { ArrowRight, ArrowLeft, CheckIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "app/lib/utils";
import { useState, useMemo } from "react";

// ----------------- Sidebar Menu Button -----------------
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
      <div className="flex items-center gap-2 w-full">
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
        <span className="text-sm truncate">{run.title}</span>
      </div>
    </button>
  );
}

// ----------------- Date Group -----------------
interface DateGroupProps {
  date: string;
  runs: Run[];
  selected: Run[];
  setSelected: (runs: Run[]) => void;
}

const DateGroup = ({ date, runs, selected, setSelected }: DateGroupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasSelectedRuns = runs.some(run => selected.some(r => r.id === run.id));

  return (
    <li className="flex flex-col gap-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-slate-100 rounded transition-colors"
      >
        <motion.span
          animate={{
            rotate: isOpen ? 90 : hasSelectedRuns ? 45 : 0
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="size-4 flex items-center shrink-0"
        >
          <ArrowRight className="size-4" />
        </motion.span>

        <span className="truncate">{date}</span>
        <span className="ml-auto bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 text-[10px] shrink-0">
          {runs.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {(isOpen || hasSelectedRuns) && (
          <motion.ul
            key={isOpen ? "all" : "selected"}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col pl-2 border-l border-slate-200 ml-3 gap-1 overflow-hidden"
          >
            {(isOpen ? runs : runs.filter(run => selected.some(r => r.id === run.id)))
              .map(run => (
                <motion.li
                  key={run.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <SidebarMenuButton run={run} selected={selected} setSelected={setSelected} />
                </motion.li>
              ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

// ----------------- Sidebar -----------------
interface SidebarProps {
  runs: Run[];
  selected: Run[];
  setSelected: (runs: Run[]) => void;
}

export function Sidebar({ runs, selected, setSelected }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  const filteredRuns = useMemo(() => {
    if (!query.trim()) return runs;
  
    const q = query.toLowerCase();
  
    return runs.filter((run) =>
      selected.some((r) => r.id === run.id) ||
      (run.title ?? "").toLowerCase().includes(q) ||
      (run.location ?? "").toLowerCase().includes(q)
    );
  }, [runs, query,selected]);
  // Group runs by date and return a sorted array of groups (newest first).
  const groupedRuns = useMemo(() => {
    const groups: Record<string, { dateObj: Date | null; runs: Run[] }> = {};

    filteredRuns.forEach((run) => {
      let dateKey = "Undated";
      let dateObj: Date | null = null;
      if (run.date) {
        dateObj = new Date(run.date);
        dateKey = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = { dateObj, runs: [] };
      }
      groups[dateKey]!.runs.push(run);
    });

    // Convert to array, sort runs inside each group (newest first), then sort groups by date (newest first). "Undated" goes last.
    const groupedArray = Object.entries(groups).map(([key, entry]) => {
      const sortedRuns = entry.runs
        .map((run) => ({
          run,
          time: run.date ? new Date(run.date).getTime() : -Infinity,
        }))
        .sort((a, b) => b.time - a.time)
        .map(({ run }) => run);
      return { dateKey: key, dateObj: entry.dateObj, runs: sortedRuns };
    });

    groupedArray.sort((a, b) => {
      if (a.dateObj && b.dateObj) return b.dateObj.getTime() - a.dateObj.getTime();
      if (a.dateObj) return -1; // a has date, b is undated -> a before b
      if (b.dateObj) return 1; // b has date, a is undated -> b before a
      return 0;
    });

    return groupedArray;
  }, [filteredRuns]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "16rem", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="sticky top-0 h-screen bg-slate-50 border-r border-slate-100 text-slate-800 z-40 overflow-hidden shrink-0"
          >

            <div className="w-64 h-full flex flex-col">
              {/* Header + title */}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-x-4">
                  <img className="w-[30%]" src="/logo-full.png" alt="Logo" />
                  <h1 className="text-l font-bold tracking-tight text-text-primary whitespace-nowrap">
                    Telemetry System
                  </h1>
                </div>
                <h1 className="font-semibold text-xl text-slate-700 whitespace-nowrap">Select runs to compare</h1>
                <h2 className="text-sm text-slate-500 whitespace-nowrap">You can compare up to 2 runs</h2>
              </div>
              <div className="px-5 pb-4 focus:outline-none focus:ring-0">
                <input
                  type="search"
                  placeholder="Search runs…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                />
              </div>


              {/* Scrollable runs list */}

              <div className="flex-1 overflow-y-auto px-4 pb-16 scrollbar-hide">
                <ul className="flex flex-col gap-2 w-full">
                  {runs.length === 0 ? (
                    <li className="text-slate-500 text-sm border-orange-400 border-l-2 bg-orange-400/10 px-2 py-1 rounded-xs">
                      No runs available - go ride your bike
                    </li>
                  ) : (
                    groupedRuns.map((group) => (
                      <DateGroup
                        key={group.dateKey}
                        date={group.dateKey}
                        runs={group.runs}
                        selected={selected}
                        setSelected={setSelected}
                      />
                    ))
                  )}
                </ul>
              </div>

              {/* Collapse button at bottom right of sidebar */}
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-open button when collapsed (Fixed position is okay here as it floats over content) */}
      <AnimatePresence>
        {collapsed && (
          <motion.button
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setCollapsed(false)}
            className="fixed bottom-4 left-4 p-3 bg-slate-800 text-white rounded-full hover:bg-slate-700 z-50 shadow-lg"
          >
            <ArrowRight className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}