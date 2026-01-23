import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { profiles, runs, users } from "../src/schema";

async function seed() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/nestjs_app";
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("🌱 Seeding database...");

  const initialProfiles = [
    {
      name: "Default Profile",
      front_min: 500,
      front_max: 900,
      back_min: 500,
      back_max: 900,
    },
  ];

  for (const profileItem of initialProfiles) {
    // 1. Check if it exists manually
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.name, profileItem.name))
      .limit(1);

    // 2. Only insert if it was NOT found
    if (!existingProfile) {
      await db.insert(profiles).values({
        name: profileItem.name,
        front_min: profileItem.front_min,
        front_max: profileItem.front_max,
        back_min: profileItem.back_min,
        back_max: profileItem.back_max,
      });
      console.log(`✅ Created: ${profileItem.name}`);
    } else {
      console.log(`⚠️ Skipped (Already exists): ${profileItem.name}`);
    }
  }

  // Insert some test users
  const initialRuns = [
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN1-2",
      title: "RUN1-2",
      comments:
        "Checking system was turning on and off correctly, only measuring shock",
      length: 2184,
      date: "2025-11-13T18:53:58.985Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:53:59.018Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN2",
      title: "RUN2",
      comments:
        "Normal settings, petentiometer came out half way down, only measuring shock",
      length: 58727,
      date: "2025-11-13T18:54:23.706Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:54:23.707Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN3",
      title: "RUN3",
      comments:
        "Not on the bike, values can be used to set 0% travel, only measuring shock",
      length: 5556,
      date: "2025-11-13T18:54:46.319Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:54:46.290Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN4",
      title: "RUN4",
      comments: "Normal settings full run, only measuring shock",
      length: 58167,
      date: "2025-11-13T18:55:07.660Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:55:07.626Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN5",
      title: "RUN5",
      comments:
        "LSC fully firm, petentiometer fell out 3/4 way down, only measuring shock",
      length: 57722,
      date: "2025-11-13T18:55:35.659Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:55:35.635Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN6",
      title: "RUN6",
      comments: "LSC fully firm, full run, only measuring shock",
      length: 54606,
      date: "2025-11-13T18:56:12.004Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:56:11.960Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN7",
      title: "RUN7",
      comments: "HSC fully firm, got puncture instantly, only measuring shock",
      length: 63191,
      date: "2025-11-13T18:56:34.814Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:56:34.801Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN8",
      title: "RUN8",
      comments: "HSC fully firm, full run, only measuring shock",
      length: 55112,
      date: "2025-11-13T18:56:54.752Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:56:54.773Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN9",
      title: "RUN9",
      comments: "HSC fully firm, full run, only measuring shock",
      length: 56679,
      date: "2025-11-13T18:57:12.942Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:57:12.899Z",
    },
    {
      srcPath:
        "https://sd-squared.s3.eu-west-2.amazonaws.com/run_data/2025-11-13/RUN10",
      title: "RUN10",
      comments: "Test Uploaded file",
      length: 16864,
      date: "2025-11-13T18:57:27.966Z",
      location: null,
      profile: 1,
      front_freq: 250,
      rear_freq: 250,
      createdAt: "2025-11-13T18:57:27.984Z",
    },
  ];

  for (const runItem of initialRuns) {
    await db
      .insert(runs)
      .values({
        srcPath: runItem.srcPath,
        title: runItem.title ?? null,
        comments: runItem.comments ?? null,
        length: Number.isFinite(runItem.length) ? runItem.length : 0,
        date: runItem.date ? new Date(runItem.date) : new Date(),
        location: runItem.location ?? null,
        profile: runItem.profile ?? null,
        front_freq: runItem.front_freq ?? 250,
        rear_freq: runItem.rear_freq ?? 250,
        createdAt: runItem.createdAt ? new Date(runItem.createdAt) : new Date(),
      })
      .onConflictDoUpdate({
        target: runs.srcPath, // <-- column(s) that have the unique constraint
        set: {
          title: runItem.title ?? null,
          comments: runItem.comments ?? null,
          length: Number.isFinite(runItem.length) ? runItem.length : 0,
          date: runItem.date ? new Date(runItem.date) : new Date(),
          location: runItem.location ?? null,
          profile: runItem.profile ?? null,
          front_freq: runItem.front_freq ?? 250,
          rear_freq: runItem.rear_freq ?? 250,
          createdAt: runItem.createdAt
            ? new Date(runItem.createdAt)
            : new Date(),
        },
      });
    console.log(`✅ Processed run: ${runItem.title}`);
  }

  console.log("🎉 Seeding completed!");
  await client.end();
}

seed().catch(console.error);
