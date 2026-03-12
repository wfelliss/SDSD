import { apiClient } from "app/api/client";

export async function getCurrentUser() {
  const res = await apiClient.get("/auth/me");
  return res.data;
}
