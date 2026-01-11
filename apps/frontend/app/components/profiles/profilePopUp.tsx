// ProfilePopup.tsx
import React from 'react';
import { Profile, ProfileRow } from './profileRow';

// Define what the component needs to function
interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  selected: any[]; // Replace 'any' with your actual Profile type if possible
}

export const ProfilePopup = ({ isOpen, onClose, selected }: ProfilePopupProps) => {
  // If the popup shouldn't be open, render nothing
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg rounded bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Profile</h2>
        
        {selected.map(({profile}: {profile: Profile}) => <ProfileRow profile={profile} />)}
        
        <div className="mt-4 text-right">
          <button
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};