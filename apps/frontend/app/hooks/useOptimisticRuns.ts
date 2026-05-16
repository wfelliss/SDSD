// app/hooks/useOptimisticRuns.ts
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Run } from "@repo/database";
import { Profile } from "app/components/profiles/profileRow";
import { RunUpdatePayload } from 'app/api/runs';

export function useOptimisticRuns(initialRuns: Run[]) {
  const queryClient = useQueryClient();
  
  const [runs, setRuns] = useState<Run[]>(initialRuns);

  // If the parent passes new server data update our local state to match it.
  useEffect(() => {
    setRuns(initialRuns);
  }, [initialRuns]);

  const handleProfileUpdate = useCallback((updatedProfile: Profile) => {
    setRuns((prevRuns) =>
      prevRuns.map((run) => {
        const profileCandidate = (run as Run & { profile?: unknown }).profile;

        if (!profileCandidate || typeof profileCandidate !== 'object' || !("id" in profileCandidate)) {
          return run;
        }

        const currentProfile = profileCandidate as Profile;
        if (currentProfile.id !== updatedProfile.id) {
          return run;
        }

        return {
          ...run,
          profile: {
            ...currentProfile,
            ...updatedProfile,
          },
        } as unknown as Run;
      })
    );

    queryClient.invalidateQueries({ queryKey: ['runs'] });
  }, [queryClient]);

  const handleRunUpdate = useCallback((id: number, updates: RunUpdatePayload) => {
    setRuns((prevRuns) => prevRuns.map((run) => (run.id === id ? { ...run, ...updates } : run)));
    queryClient.invalidateQueries({ queryKey: ['runs'] });
  }, [queryClient]);

  return {
    runs,
    handleProfileUpdate,
    handleRunUpdate,
  };
} 