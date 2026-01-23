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
