import { Inject, Injectable } from '@nestjs/common';
import { NewProfile, Profile, profiles } from 'src/database/schema';

@Injectable()
export class ProfilesService {
    constructor(@Inject('DATABASE_CONNECTION') private readonly db: any) {}

    async findAll(): Promise<Profile[]> {
        return await this.db.select().from('profiles');
    }

    async findOne(id: number): Promise<Profile | null> {
        const result = await this.db.select().from('profiles').where({ id });
        return result[0] || null;
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

    async update( id: number, profileData: Partial<Omit<Profile, 'id' | 'createdAt'>>): Promise<Profile | null> {
        const result = await this.db
            .update('profiles')
            .set({
                ...profileData,
                updatedAt: new Date(),
            })
            .where({ id })
            .returning();
        return result[0] || null;
    }

    async remove(id: number): Promise<boolean> {
        const result = await this.db
            .delete('profiles')
            .where({ id })
            .returning();
        return result.length > 0;
    }
}
