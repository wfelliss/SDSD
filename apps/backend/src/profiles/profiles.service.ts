import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { NewProfile, Profile, profiles } from "@repo/database";

@Injectable()
export class ProfilesService {
  constructor(@Inject("DATABASE_CONNECTION") private readonly db: any) {}

  async findAll(): Promise<Profile[]> {
    return await this.db.select().from(profiles);
  }

  async findOne(id: number): Promise<Profile | null> {
    const result = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id));
    return result[0] || null;
  }

  async findOneByName(name: string): Promise<Profile | null> {
    const results = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.name, name));
    return results[0] || null;
  }

  async create(
    userData: Omit<NewProfile, "createdAt" | "updatedAt">
  ): Promise<Profile> {
    const result = await this.db
      .insert(profiles)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async update(
    id: number,
    profileData: Partial<Omit<Profile, "id" | "createdAt">>
  ): Promise<Profile | null> {
    
    // 1. Destructure to separate 'createdAt' (and 'id') from the rest of the data.
    //    'rest' will contain only the safe fields.
    //    We treat profileData as 'any' briefly to allow destructuring properties that TS thinks aren't there.
    const { createdAt, id: _, ...safeData } = profileData as any;

    const result = await this.db
      .update(profiles)
      .set({
        ...safeData, // 👈 Now this is guaranteed clean
        updatedAt: new Date(), // We verify the date manually here
      })
      .where(eq(profiles.id, id))
      .returning();

    return result[0] || null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.db
      .delete(profiles)
      .where(eq(profiles.id, id))
      .returning();
    return result.length > 0;
  }
}
