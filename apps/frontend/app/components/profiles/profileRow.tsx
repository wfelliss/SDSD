import { useState } from "react";
import { useIsMobile } from "app/hooks/useIsMobile";
import { UserIcon, ClockIcon, EditIcon, XIcon, CheckIcon, LoaderCircleIcon, ArrowRightIcon, ArrowLeftIcon } from "lucide-react";
import { Transition } from "@headlessui/react";
import { cn, formatDate } from "app/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "app/api/client";
import { MAX_TRAVEL } from "app/lib/telemetryUtils";
import type { Profile as DbProfile } from "@repo/database";

export type Profile = DbProfile & {
  createdAt: Date | string;
  updatedAt: Date | string;
};


interface ProfileRowProps {
  profile: Profile | null;
  onProfileChange?: (profile: Profile) => void;
}

export function ProfileRow({ profile: initialProfile, onProfileChange }: ProfileRowProps) {
  if (!initialProfile) {
    return null;
  }

  const [editing, setEditing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState(initialProfile);

  function numberFieldChangeHandler(field: 'front_min' | 'front_max' | 'back_min' | 'back_max') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      


      // Allow empty string and treat as 0. Alternatively, handle validation on save.
      if (rawValue === '') {
        setProfile((prev) => ({ ...prev, [field]: 0 }));
        return;
      }

      const value = Number(rawValue);

      // Only update state if it's a valid number
      if (!isNaN(value)) {
        setProfile((prev) => ({
          ...prev,
          [field]: value,
        }));
      }
    };
  }

  const {
    mutateAsync: updateProfile,
    isPending,
    isError,
  } = useMutation({
    mutationFn: (
      partialProfile: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>
    ) => {
      return partialUpdateProfile(profile.id, partialProfile);
    },
  });

  return (
    <li
      className="px-6 py-5 flex flex-col gap-3 transition-all group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex justify-between">
        <div className="flex gap-2 items-center capitalize text-text-primary min-w-0">
          <UserIcon className="size-4 shrink-0 text-text-secondary" />
          <p className="font-semibold truncate">{profile.name}</p>
        </div>
        <div className="flex items-center">
          <div className="flex gap-2 text-text-secondary items-center">
            <p>{formatDate(new Date(profile.createdAt))}</p>
            <ClockIcon className="size-4" />
          </div>
          <div
            className={cn(
              "transition-[width] w-0 overflow-x-hidden relative h-full",
              editing ? "w-15" : isMobile ? "w-8" : "group-hover:w-8"
            )}
          >
            <Transition
              as="div"
              show={isMobile ? !editing : hovering && !editing}
              enter="transition-opacity"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              className="absolute ml-2 flex items-center inset-0 size-full"
            >
              <button
                onClick={() => setEditing(true)}
                className="p-1 hover:bg-blue-100 rounded text-text-secondary hover:text-blue-500 transition-colors"
              >
                <EditIcon className="size-4" />
              </button>
            </Transition>
            <Transition
              as="div"
              show={editing}
              enter="transition-opacity"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              className="absolute ml-2 items-center inset-0 size-full flex gap-1"
            >
              <button
                onClick={() => {
                  setEditing(false);
                  setProfile(initialProfile);
                }}
                disabled={isPending}
                className={cn(
                  "p-1 rounded",
                  isPending && !isError
                    ? "bg-gray-100 text-gray-500"
                    : "hover:bg-red-100 text-red-500"
                )}
              >
                <XIcon className="size-4 " />
              </button>
              <button
                onClick={() => {
                  const editableFields = {
                        name: profile.name,
                        front_min: profile.front_min,
                        front_max: profile.front_max,
                        back_min: profile.back_min,
                        back_max: profile.back_max,
                      };
                  updateProfile(editableFields).then(() => {
                    setEditing(false)
                    if (!onProfileChange) return
                    onProfileChange(profile)
                  });
                }}
                disabled={isPending}
                className={cn(
                  "p-1 rounded",
                  isPending && !isError
                    ? "bg-gray-100 text-gray-500"
                    : "hover:bg-green-100 text-green-500"
                )}
              >
                {isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
              </button>
            </Transition>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="flex gap-2 items-center">
              <ArrowRightIcon className="size-4 text-cyan-700" />
              <p className="text-xs text-text-tertiary font-medium">Front</p>
            </div>
            <pre className="text-xs text-cyan-700 font-light flex gap-2">
              <input
                name="front-min"
                type="text"
                value={profile.front_min}
                readOnly={!editing}
                onChange={numberFieldChangeHandler("front_min")}
                className={cn(
                  "field-sizing-content px-1 rounded border border-transparent transition-colors",
                  editing && "border-page-background-primary"
                )}
              />
              <p>-</p>
              <input
                name="front-max"
                type="text"
                value={profile.front_max}
                readOnly={!editing}
                onChange={numberFieldChangeHandler("front_max")}
                className={cn(
                  "field-sizing-content px-1 rounded border border-transparent transition-colors",
                  editing && "border-page-background-primary"
                )}
              />
            </pre>
          </div>
          <div className="w-full h-2 rounded-full bg-card-background-secondary shadow">
            <div
              className="bg-cyan-700 rounded-full h-full relative"
              style={{
                width: `${((profile.front_max - profile.front_min) / MAX_TRAVEL) * 100}%`,
                left: `${(profile.front_min / MAX_TRAVEL) * 100}%`,
              }}
            ></div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="flex gap-2 items-center">
              <ArrowLeftIcon className="size-4 text-orange-700" />
              <p className="text-xs text-text-tertiary font-medium">Back</p>
            </div>
            <pre className="text-xs text-orange-700 font-light flex gap-2">
              <input
                name="back-min"
                type="text"
                value={profile.back_min}
                readOnly={!editing}
                onChange={numberFieldChangeHandler("back_min")}
                className={cn(
                  "field-sizing-content px-1 rounded border border-transparent transition-colors",
                  editing && "border-page-background-primary"
                )}
              />
              <p>-</p>
              <input
                name="back-max"
                type="text"
                value={profile.back_max}
                readOnly={!editing}
                onChange={numberFieldChangeHandler("back_max")}
                className={cn(
                  "field-sizing-content px-1 rounded border border-transparent transition-colors",
                  editing && "border-page-background-primary"
                )}
              />
            </pre>
          </div>
          <div className="w-full h-2 rounded-full bg-card-background-secondary shadow-xs">
            <div
              className="bg-orange-700 rounded-full h-full relative"
              style={{
                width: `${((profile.back_max - profile.back_min) / MAX_TRAVEL) * 100}%`,
                left: `${(profile.back_min / MAX_TRAVEL) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </li>
  );
}

async function partialUpdateProfile(
  profileId: number,
  partialProfile: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>
) {
  return await apiClient.patch(`/profiles/${profileId}`, partialProfile);
}