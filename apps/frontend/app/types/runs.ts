import { Profile } from "app/api/profiles";

export type RunItem = {
  id: number;
  title: string | null;
  srcPath: string;
  date?: string;
  location?: string;
  front_freq?: number;
  rear_freq?: number;
  length?: number;
  profile? : Profile
};

export type RunJson = Record<string, any>;