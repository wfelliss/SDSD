import { Run } from '@repo/database';
import { Profile, ProfileRow } from './profileRow';

interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  selected: Run[]; 
  onProfileUpdate?: (updatedProfile: Profile) => void; 
}

export const ProfilePopup = ({ isOpen, onClose, selected, onProfileUpdate }: ProfilePopupProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      
      <div className="relative z-10 w-full max-w-lg mx-4 rounded bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Profile</h2>
        
        <div className="flex flex-col gap-2">
            {selected.map((run: any) => (
            <ProfileRow 
                key={run.profile?.id || run.id} 
                profile={run.profile} 
                onProfileChange={(updated) => {
                    // Bubble the event up to MainContent
                    if (onProfileUpdate) onProfileUpdate(updated);
                }} 
            />
            ))}
        </div>
        
        <div className="mt-4 text-right">
          <button
            className="cursor-pointer inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};