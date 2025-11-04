import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.module";
import { users, type User, type NewUser } from "../database/schema";

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: any) {}

  async findAll(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async findOne(id: number): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  }

  async create(
    userData: Omit<NewUser, "createdAt" | "updatedAt">
  ): Promise<User> {
    const result = await this.db
      .insert(users)
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
    userData: Partial<Omit<NewUser, "id" | "createdAt">>
  ): Promise<User | null> {
    const result = await this.db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return result[0] || null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }
}
