import { apiClient } from "./client";
import { Run } from "@repo/database";

export function getRuns() {
  return apiClient.get<Run[]>("/runs");
}

export function getRunById(id: number) {
  return apiClient.get<Run>(`/runs/${id}`);
}
