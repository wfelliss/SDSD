import { Injectable, Inject } from '@nestjs/common';
import { eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../database/database.module";
import { runs, type Run, type NewRun } from "../database/schema";

@Injectable()
export class RunsService {
    constructor(@Inject(DATABASE_CONNECTION) private readonly db: any) {}

    async getAllRuns() {
        return await this.db.select().from(runs);
    }

    async getRunById(id: number) {
        const result = await this.db.select().from(runs).where(eq(runs.id, id));
        return result[0] ?? null;
    }

    async findBySrcPath(srcPath: string) {
        const result = await this.db.select().from(runs).where(eq(runs.srcPath, srcPath));
        return result[0] ?? null;
    }

    async createRun(data: {
    srcPath: string;
    comments?: string;
    length: number;
    date?: Date;
    location?: string;
    }) {
    // enforce uniqueness at service level to avoid duplicate runs
    const existing = await this.findBySrcPath(data.srcPath);
    if (existing) {
        throw new Error('Run with this srcPath already exists');
    }

    const inserted = await this.db.insert(runs).values({
        ...data,
        date: data.date ?? new Date(), // default to now if not provided
    }).returning();

    return inserted[0];
    }
}
