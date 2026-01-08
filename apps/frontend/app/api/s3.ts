import { apiClient } from "./client";

export function getFile(file: string) {
  return apiClient.get<any>("/s3/file", { params: { path: file } });
}