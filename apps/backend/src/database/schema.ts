import { pgTable, serial, varchar, timestamp, text, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  front: varchar("front", { length: 255 }),
  back: varchar("back", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

<<<<<<< HEAD
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
=======
export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),

  srcPath: varchar("src_path", { length: 1024 }).notNull().unique(),   // e.g. file path to source
  title: varchar("title", { length: 255 }),
  comments: text("comments"),            // optional notes
  length: integer("length").notNull(),   // e.g. number of samples, seconds, etc.
  date: timestamp("date").defaultNow().notNull(),  // run date/time
  location: varchar("location", { length: 255 }),  // place or tag for run

  createdAt: timestamp("created_at").defaultNow(),
});

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
>>>>>>> 9338dd6e4e7796b594751781f126f4d8d82ae4eb
