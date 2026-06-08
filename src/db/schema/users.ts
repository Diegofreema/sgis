import {
  boolean,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "parent", "admin"]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    parentProfileId: uuid("parent_profile_id"),
    role: userRoleEnum("role").notNull().default("student"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email").notNull(),
    phone: text("phone"),
    dateOfBirth: text("date_of_birth"),
    gender: genderEnum("gender"),
    address: text("address"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    requiresPasswordChange: boolean("requires_password_change")
      .notNull()
      .default(false),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    // Extended profile fields
    previousSchool: text("previous_school"),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    guardianEmail: text("guardian_email"),
    // Admin notes (internal)
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    parentProfileFk: foreignKey({
      columns: [table.parentProfileId],
      foreignColumns: [table.id],
      name: "profiles_parent_profile_id_profiles_id_fk",
    }).onDelete("set null"),
    parentProfileIdx: index("profiles_parent_profile_id_idx").on(table.parentProfileId),
  })
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
