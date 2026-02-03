import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date consistently across server and client to prevent hydration mismatches
 */
export function formatDate(date: Date): string {

  if (!date) return ""; // Handle null/undefined gracefully

  // Ensure it is a Date object
  const dateObj = new Date(date);

  // Check if the date is valid (e.g. not "Invalid Date")
  if (isNaN(dateObj.getTime())) {
    return ""; // or return a fallback string like "N/A"
  }
  
  return dateObj.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function extractFrequencyNumber(sampleFreq: unknown): number | null {
  if (!sampleFreq) return null;
  
  if (typeof sampleFreq === "number") {
    return Number.isFinite(sampleFreq) ? sampleFreq : null;
  }
  
  if (typeof sampleFreq === "string") {
    const n = Number(sampleFreq);
    return Number.isFinite(n) ? n : null;
  }
  
  if (typeof sampleFreq === "object") {
    const vals = Object.values(sampleFreq);
    for (const v of vals) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  
  return null;
}
