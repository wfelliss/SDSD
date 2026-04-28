import { apiClient } from "./client";
import { Run } from "@repo/database";

export interface RunUpdatePayload {
  comments?: string;
  length?: number;
  location?: string;
  lower_bound_idx?: number;
  upper_bound_idx?: number;
}

export function getRuns() {
  return apiClient.get<Run[]>("/runs");
}

export function getRunById(id: number) {
  return apiClient.get<Run>(`/runs/${id}`);
}

export function updateRun(id: number, payload: RunUpdatePayload) {
    return apiClient.patch(`/runs/${id}`, payload);
} 
