// app/hooks/useOptimisticRuns.ts
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Profile, Run } from "@repo/database";

export function useOptimisticRuns(initialRuns: Run[]) {
  const queryClient = useQueryClient();
  
  const [runs, setRuns] = useState<Run[]>(initialRuns);

  // If the parent passes new server data update our local state to match it.
  useEffect(() => {
    setRuns(initialRuns);
  }, [initialRuns]);

  const handleProfileUpdate = useCallback((_: Profile) => {
    queryClient.invalidateQueries({ queryKey: ['runs'] });
  }, [queryClient]);

  const handleRunUpdate = useCallback((id: number, updates: Partial<Pick<Run, 'comments' | 'length' | 'location'>>) => {
    setRuns((prevRuns) => prevRuns.map((run) => (run.id === id ? { ...run, ...updates } : run)));
    queryClient.invalidateQueries({ queryKey: ['runs'] });
  }, [queryClient]);

  return {
    runs,
    handleProfileUpdate,
    handleRunUpdate,
  };
} 