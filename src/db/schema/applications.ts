import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const applicationPeriodStatusEnum = pgEnum("application_period_status", [
  "upcoming",
  "open",
  "closed",
  "archived",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "pending_payment",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]);

export const applicationPeriods = pgTable("application_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  applicationStartDate: timestamp("application_start_date", {
    withTimezone: true,
  }).notNull(),
  applicationEndDate: timestamp("application_end_date", {
    withTimezone: true,
  }).notNull(),
  examStartDate: timestamp("exam_start_date", { withTimezone: true }).notNull(),
  examEndDate: timestamp("exam_end_date", { withTimezone: true }).notNull(),
  registrationFee: numeric("registration_fee", {
    precision: 12,
    scale: 2,
  }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  eligibleClasses: jsonb("eligible_classes").$type<string[]>().notNull().default([]),
  status: applicationPeriodStatusEnum("status").notNull().default("upcoming"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  applicationPeriodId: uuid("application_period_id")
    .notNull()
    .references(() => applicationPeriods.id),
  intendedClass: text("intended_class").notNull(),
  previousSchool: text("previous_school"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  guardianEmail: text("guardian_email"),
  // Supporting documents stored as Supabase Storage paths
  documentUrls: jsonb("document_urls").$type<string[]>().default([]),
  status: applicationStatusEnum("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApplicationPeriod = typeof applicationPeriods.$inferSelect;
export type NewApplicationPeriod = typeof applicationPeriods.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
