import type { MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import { ProfileRow} from "../../components/profiles/profileRow";
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
    console.error("Error loading profiles:", error);
    return { profiles: [], error: "Failed to load profiles." };
  }
};

export default function ProfilesPage() {
  const { profiles} = useLoaderData<typeof loader>();
  const safeProfiles = (profiles ?? []).filter(
    (profile: Profile | null | undefined): profile is Profile =>
      Boolean(profile && profile.id && profile.name),
  );

  return (
    <div className="flex flex-col items-center pt-20 px-4 md:px-8">
      <div className="flex flex-col gap-4 max-w-4xl w-full">
        <div className="flex flex-col">
          <h1 className="text-text-primary font-semibold">Profiles</h1>
          <p className="text-text-secondary text-sm">
            Manage your user profiles here.
          </p>
        </div>
        <ul className="flex flex-col rounded shadow bg-card-background-primary divide-y-2 divide-page-background-primary">
          {safeProfiles.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} />
          ))}
        </ul>
      </div>
    </div>
  );
}
