import type { MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { apiClient} from "app/api/client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  LoaderCircleIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { cn, formatDate } from "app/lib/utils";
import { useState } from "react";
import { Transition } from "@headlessui/react";
import { useMutation} from "@tanstack/react-query";
import { getProfiles } from "app/api/profiles";

export const meta: MetaFunction = () => {
  return [
    { title: "Profiles" },
    { name: "description", content: "View and manage user profiles" },
  ];
};

export const loader = async () => {
  try {
    const profiles = await getProfiles();
    return { profiles: profiles.data, error: null };
  } catch (error) {
    return { profiles: [], error: "Failed to load profiles." };
  }
};

interface Profile {
  id: number;
  name: string;
  front_min: number;
  front_max: number;
  back_min: number;
  back_max: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilesPage() {
  const { profiles} = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center pt-20">
      <div className="flex flex-col gap-4 max-w-4xl w-full">
        <div className="flex flex-col">
          <h1 className="text-text-primary font-semibold">Profiles</h1>
          <p className="text-text-secondary text-sm">
            Manage your user profiles here.
          </p>
        </div>
        <ul className="flex flex-col rounded shadow bg-card-background-primary divide-y-2 divide-page-background-primary">
          {profiles?.map(
            (profile) =>
              profile && <ProfileRow key={profile.id} profile={profile} />
          )}
        </ul>
      </div>
    </div>
  );
}

interface ProfileRowProps {
  profile: Profile;
}

async function partialUpdateProfile(
  profileId: number,
  partialProfile: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>
) {
  return await apiClient.patch(`/profiles/${profileId}`, partialProfile);
}
function ProfileRow({ profile: initialProfile }: ProfileRowProps) {
  const [editing, setEditing] = useState(false);
  const [hovering, setHovering] = useState(false);

  const [profile, setProfile] = useState(initialProfile);

  function numberFieldChangeHandler(field: keyof Profile) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.value) return;

      const value = Number(e.target.value);

      if (isNaN(value)) {
        e.target.value = profile[field].toString();
        return;
      }

      setProfile((prev) => ({
        ...prev,
        [field]: value,
      }));
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
      className="p-4 flex flex-col gap-2 transition-all group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex justify-between">
        <div className="flex gap-2 items-center capitalize text-text-primary">
          <UserIcon className="size-4 text-text-secondary" />
          <p className="font-semibold">{profile.name}</p>
        </div>
        <div className="flex items-center">
          <div className="flex gap-2 text-text-secondary items-center">
            <p>{formatDate(profile.createdAt)}</p>
            <ClockIcon className="size-4" />
          </div>
          <div
            className={cn(
              "transition-[width] w-0 overflow-x-hidden relative h-full",
              editing ? "w-15" : "group-hover:w-8"
            )}
          >
            <Transition
              as="div"
              show={hovering && !editing}
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
                onClick={() => setEditing(false)}
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
                  const {...editableFields } =
                    profile;
                  updateProfile(editableFields).then(() => setEditing(false));
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
      <div className="flex gap-4">
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
                defaultValue={profile.front_min}
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
                defaultValue={profile.front_max}
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
                width: `${((profile.front_max - profile.front_min) / 4096) * 100}%`,
                left: `${(profile.front_min / 4096) * 100}%`,
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
                defaultValue={profile.back_min}
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
                defaultValue={profile.back_max}
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
                width: `${((profile.back_max - profile.back_min) / 4096) * 100}%`,
                left: `${(profile.back_min / 4096) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </li>
  );
}
