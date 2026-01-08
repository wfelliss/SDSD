import { apiClient } from "./client";

export interface Profile {
    id: number;
    name: string;
    front_min : number;
    front_max : number;
    back_min : number;
    back_max : number;
    createdAt: string;
    updatedAt: string;
}

export function getProfiles() {
  return apiClient.get<Profile[]>("/profiles");
}