import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  front_min: integer("front_min").notNull().default(0),
  front_max: integer("front_max").notNull().default(4096),
  back_min: integer("back_min").notNull().default(0),
  back_max: integer("back_max").notNull().default(4096),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),

  srcPath: varchar("src_path", { length: 1024 }).notNull().unique(), // e.g. file path to source
  title: varchar("title", { length: 255 }),
  comments: text("comments"), // optional notes
  length: integer("length").notNull(), // e.g. number of samples, seconds, etc.
  date: timestamp("date").defaultNow().notNull(), // run date/time
  location: varchar("location", { length: 255 }), // place or tag for run
  profile: integer("profile").references(() => profiles.id), // associated profile

  createdAt: timestamp("created_at").defaultNow(),
});

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

// Relations
export const runsRelations = relations(runs, ({ one }) => ({
  profile: one(profiles, {
    fields: [runs.profile],
    references: [profiles.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  runs: many(runs),
}));
