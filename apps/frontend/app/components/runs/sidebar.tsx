import {RunItem} from "app/types/runs";
import {ArrowRight, CheckIcon} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {cn} from "app/lib/utils";

import { useState, useMemo } from 'react';

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
    </button>
  )
}


interface DateGroupProps {
  date: string;
  runs: RunItem[];
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}
// 2. The "Folder" Component
const DateGroup = ({ date, runs, selected, setSelected }: DateGroupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Check if any run in this group is selected
  const hasSelectedRuns = runs.some(run => selected.some(r => r.id === run.id));

  return (
    <li className="flex flex-col gap-1">
      {/* Folder Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-slate-100 rounded transition-colors"
      >
        {/* Rotating Arrow */}
        <motion.span
          animate={{ 
            rotate: isOpen ? 90 : hasSelectedRuns ? 45 : 0  // 0° = closed, 45° = closed with selected, 90° = fully open
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="size-4 flex items-center"
        >
          <ArrowRight className="size-4" />
        </motion.span>

        {date}
        <span className="ml-auto bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 text-[10px]">
          {runs.length}
        </span>
      </button>

      {/* Animated Dropdown Content */}
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
              .map((run) => (
                <SidebarMenuButton
                  key={run.id}
                  run={run}
                  selected={selected}
                  setSelected={setSelected}
                />
              ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

// ---------------------- SIDEBAR COMPONENTS ----------------------
interface SidebarProps {
  runs: RunItem[];
  selected: RunItem[];
  setSelected: (runs: RunItem[]) => void;
}

export function Sidebar({ runs, selected, setSelected } : SidebarProps) {
  
  // Logic: Group runs by date
  // Assumes run.date exists. If your property is run.createdAt, change it below.
  const groupedRuns = useMemo(() => {
    const groups: Record<string, typeof runs> = {};
    
    runs.forEach((run) => {
      let dateKey = 'Undated'
      // Format date: e.g., "Fri, Jan 12, 2024"
      // You can adjust 'en-US' or options to change how the folder name looks
      if (run.date) {
        dateKey = new Date(run.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey]?.push(run);
    });

    return groups;
  }, [runs]);

  return (
    <div className="w-64 min-h-screen h-max p-4 flex flex-col gap-4 bg-slate-50 border-r border-slate-100 text-slate-800">
      <div className="flex flex-col">
        <div className="flex items-center gap-x-4 m-1">
          <img className="w-[30%]" src="/logo-full.png" alt="Logo" />
          <h1 className="text-l font-bold tracking-tight text-text-primary whitespace-nowrap">Telemetry System</h1>
        </div>
        <h1 className="font-semibold text-xl text-slate-700">Select runs to compare</h1>
        <h2 className="text-sm text-slate-500">You can compare up to 2 runs</h2>
      </div>

      <ul className="flex flex-col gap-2">
        {runs.length === 0 ? (
          <li className="text-slate-500 text-sm border-orange-400 border-l-2 bg-orange-400/10 px-2 py-1 rounded-xs">
            No runs available - go ride your bike
          </li>
        ) : (
          // Iterate over the Object Keys (The Dates) in reverse order
          Object.keys(groupedRuns).reverse().map((date) => {
            const groupRuns = groupedRuns[date];
            if (!groupRuns) { return}
            return (
              <DateGroup
                key={date}
                date={date}
                runs={groupRuns}
                selected={selected}
                setSelected={setSelected}
              />
            )
          })
        )}
      </ul>
    </div>
  );
}
