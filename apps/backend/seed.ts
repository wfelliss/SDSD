import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./src/database/schema";

async function seed() {
  const connectionString =
    "postgresql://postgres:password@localhost:5432/nestjs_app";
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("🌱 Seeding database...");

  // Insert some test users
  const testUsers = [
    {
      name: "John Doe",
      email: "john@example.com",
      bio: "Software developer and tech enthusiast",
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      bio: "Designer and creative thinker",
    },
    {
      name: "Bob Wilson",
      email: "bob@example.com",
      bio: "Product manager and strategy expert",
    },
  ];

  for (const user of testUsers) {
    try {
      await db.insert(users).values({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Created user: ${user.name}`);
    } catch (error) {
      console.log(`⚠️  User ${user.name} might already exist`);
    }
  }

  console.log("🎉 Seeding completed!");
  await client.end();
}

seed().catch(console.error);
