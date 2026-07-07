import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const admissionSettings = pgTable("admission_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  singletonKey: text("singleton_key").notNull().unique().default("default"),
  isOpen: boolean("is_open").notNull().default(false),
  academicSession: text("academic_session").notNull().default(""),
  applicationDeadline: timestamp("application_deadline", { withTimezone: true }),
  notes: text("notes"),
  schoolName: text("school_name").notNull().default("Sankt Georg International School"),
  schoolEmail: text("school_email"),
  schoolPhone: text("school_phone"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedBy: uuid("updated_by").references(() => profiles.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdmissionSettings = typeof admissionSettings.$inferSelect;
