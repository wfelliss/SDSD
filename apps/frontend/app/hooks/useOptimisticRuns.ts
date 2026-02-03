// app/hooks/useOptimisticRuns.ts
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Run } from "@repo/database"; // Matching your MainContent import
import { Profile } from '../components/profiles/profileRow';

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
        // Check if this run owns the profile being updated
        // Note: We cast to 'any' here because strictly 'Run' might not have the profile relation loaded in types, 
        // but your runtime code relies on it.
        const currentProfile = (run as any).profile;
        
        if (currentProfile && currentProfile.id === updatedProfile.id) {
          // Create a NEW run object, and a NEW profile object inside it
          // This ensures React detects the change and re-renders
          return {
            ...run,
            profile: {
              ...currentProfile,
              ...updatedProfile,
            },
          } as Run;
        }
        // Return other runs unchanged
        return run;
      })
    );

    // Background Sync: Tell server to fetch latest data to ensure consistency
    // Replace 'runs' with the specific query key you use in your app
    queryClient.invalidateQueries({ queryKey: ['runs'] });
  }, [queryClient]);

  const handleRunUpdate = useCallback((id: number, updates: Partial<Pick<Run, 'comments' | 'length' | 'location'>>) => {
    setRuns((prevRuns) => prevRuns.map((run) => (run.id === id ? { ...run, ...updates } : run)));
    queryClient.invalidateQueries({ queryKey: ['runs'] });
  }, [queryClient]);

  return {
    runs, // Return the "live" state, not the static prop
    handleProfileUpdate,
    handleRunUpdate,
  };
} 