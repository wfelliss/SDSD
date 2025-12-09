import { apiClient } from "./client";

export interface Run {
  id: number;
  srcPath: string;
  title: string;
  date?: string;
  location?: string;
  length?: number;
}

export function getRuns() {
  return apiClient.get<Run[]>("/runs");
}