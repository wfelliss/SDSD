import { Injectable, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.module";
import { runs, profiles, type Run, type NewRun } from "../database/schema";

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
}
