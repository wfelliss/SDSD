import { apiClient } from "./client";
import { Run } from "@repo/database";

export function getRuns() {
  return apiClient.get<Run[]>("/runs");
}

export function getRunById(id: number) {
  return apiClient.get<Run>(`/runs/${id}`);
}

export function updateRun(id: number, payload: Partial<Pick<Run, 'comments' | 'length' | 'location'>>) {
    return apiClient.patch(`/runs/${id}`, payload);
} 
