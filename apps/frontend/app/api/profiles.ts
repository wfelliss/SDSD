import { apiClient } from "./client";
import { Profile } from "@repo/database";

export function getProfiles() {
  return apiClient.get<Profile[]>("/profiles");
}
