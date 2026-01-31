import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.module";
import { runs } from "@repo/database";

@Injectable()
export class RunsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: any) {}

  async getAllRuns() {
    return await this.db.query.runs.findMany({
      with: {
        profile: true,
      },
    });
  }

  async getRunById(id: number) {
    return await this.db.query.runs.findFirst({
      where: eq(runs.id, id),
      with: {
        profile: true,
      },
    });
  }

  async findBySrcPath(srcPath: string) {
    const result = await this.db
      .select()
      .from(runs)
      .where(eq(runs.srcPath, srcPath));
    return result[0] ?? null;
  }

  async createRun(data: {
    srcPath: string;
    comments?: string;
    length: number;
    date?: Date;
    location?: string;
    profile?: number;
    front_freq?: number;
    rear_freq?: number;
  }) {
    // enforce uniqueness at service level to avoid duplicate runs
    const existing = await this.findBySrcPath(data.srcPath);
    if (existing) {
      throw new Error("Run with this srcPath already exists");
    }

    const inserted = await this.db
      .insert(runs)
      .values({
        ...data,
        date: data.date ?? new Date(), // default to now if not provided
      })
      .returning();

    return inserted[0];
  }

  // Partial update for a run (e.g., update comments)
  async updateRun(id: number, updates: Partial<{ comments: string; length: number; location: string }>) {
    const { comments, length, location } = updates;
    
    // Build update object with only the fields that are actually provided
    const updateData: Partial<{ comments: string; length: number; location: string }> = {};
    
    if (comments !== undefined) {
      updateData.comments = comments;
    }
    if (length !== undefined) {
      updateData.length = length;
    }
    if (location !== undefined) {
      updateData.location = location;
    }
    
    // If no valid updates provided, return null or throw error
    if (Object.keys(updateData).length === 0) {
      return null; // or throw new Error("No valid fields to update");
    }
    
    const updated = await this.db
      .update(runs)
      .set(updateData)
      .where(eq(runs.id, id))
      .returning();

    return updated[0] ?? null;
  }
} 
