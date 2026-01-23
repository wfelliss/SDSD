import type { MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { apiClient} from "app/api/client";
import { ProfileRow} from "../../components/profiles/profileRow";

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
import { useMutation } from "@tanstack/react-query";
import { getProfiles } from "app/api/profiles";
import { Profile } from "@repo/database";

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
