import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface CvSection {
  heading: string;
  content: string;
}

export interface CvParsed {
  summary: string | null;
  sections: CvSection[];
  name?: string | null;
  phone?: string | null;
  location?: string | null;
}

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  yearsOfExperience: integer("years_of_experience").notNull(),
  skills: text("skills").array().notNull().default([]),
  linkedinUrl: text("linkedin_url"),
  phone: text("phone"),
  location: text("location"),
  cvText: text("cv_text"),
  cvFileName: text("cv_file_name"),
  cvParsed: jsonb("cv_parsed").$type<CvParsed>(),
  profileComplete: boolean("profile_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
