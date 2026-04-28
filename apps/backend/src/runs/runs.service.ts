import { Injectable, Inject, BadRequestException, ConflictException } from "@nestjs/common";
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
    lower_bound_idx?: number;
    upper_bound_idx?: number;
    front_freq?: number;
    rear_freq?: number;
  }) {
    // enforce uniqueness at service level to avoid duplicate runs
    const existing = await this.findBySrcPath(data.srcPath);
    if (existing) {
      throw new ConflictException("Run with this srcPath already exists");
    }

    const resolvedLowerBound = data.lower_bound_idx ?? 0;
    const resolvedUpperBound = data.upper_bound_idx ?? Math.max(data.length - 1, 0);

    const inserted = await this.db
      .insert(runs)
      .values({
        ...data,
        lower_bound_idx: resolvedLowerBound,
        upper_bound_idx: resolvedUpperBound,
        date: data.date ?? new Date(), // default to now if not provided
      })
      .returning();

    return inserted[0];
  }

  // Partial update for a run (e.g., update comments)
  async updateRun(
    id: number,
    updates: Partial<{
      comments: string;
      length: number;
      location: string;
      lower_bound_idx: number;
      upper_bound_idx: number;
    }>,
  ) {
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException("No updates provided for the run.");
    }

    const hasBoundsUpdate =
      updates.lower_bound_idx !== undefined ||
      updates.upper_bound_idx !== undefined ||
      updates.length !== undefined;

    if (hasBoundsUpdate) {
      const currentRun = await this.getRunById(id);
      if (!currentRun) {
        return null;
      }

      const effectiveLength = updates.length ?? currentRun.length;
      const effectiveLowerBound =
        updates.lower_bound_idx ?? currentRun.lower_bound_idx ?? 0;
      const effectiveUpperBound =
        updates.upper_bound_idx ?? currentRun.upper_bound_idx ?? Math.max(effectiveLength - 1, 0);

      if (!Number.isInteger(effectiveLowerBound) || !Number.isInteger(effectiveUpperBound)) {
        throw new BadRequestException("Trim bounds must be integers.");
      }

      if (effectiveLength <= 0) {
        throw new BadRequestException("Run length must be greater than zero.");
      }

      if (effectiveLowerBound < 0) {
        throw new BadRequestException("lower_bound_idx must be greater than or equal to zero.");
      }

      if (effectiveUpperBound < effectiveLowerBound) {
        throw new BadRequestException("upper_bound_idx must be greater than or equal to lower_bound_idx.");
      }

      if (effectiveUpperBound >= effectiveLength) {
        throw new BadRequestException("upper_bound_idx must be less than run length.");
      }
    }

    const updated = await this.db
      .update(runs)
      .set(updates)
      .where(eq(runs.id, id))
      .returning();

    return updated[0] ?? null;
  }
} 
