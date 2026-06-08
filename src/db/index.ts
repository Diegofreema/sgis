/**
 * Drizzle database instance.
 * Import `db` and schema types from here throughout the app.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as usersSchema from "./schema/users";
import * as applicationsSchema from "./schema/applications";
import * as paymentsSchema from "./schema/payments";
import * as bankAccountsSchema from "./schema/bank_accounts";
import * as examsSchema from "./schema/exams";
import * as attemptsSchema from "./schema/attempts";
import * as announcementsSchema from "./schema/announcements";
import * as cmsSchema from "./schema/cms";
import * as gallerySchema from "./schema/gallery";
import * as settingsSchema from "./schema/settings";

const schema = {
  ...usersSchema,
  ...applicationsSchema,
  ...paymentsSchema,
  ...bankAccountsSchema,
  ...examsSchema,
  ...attemptsSchema,
  ...announcementsSchema,
  ...cmsSchema,
  ...gallerySchema,
  ...settingsSchema,
};

// Re-export all schema for convenience
export * from "./schema/users";
export * from "./schema/applications";
export * from "./schema/payments";
export * from "./schema/bank_accounts";
export * from "./schema/exams";
export * from "./schema/attempts";
export * from "./schema/announcements";
export * from "./schema/cms";
export * from "./schema/gallery";
export * from "./schema/settings";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Return a mock in environments without a DB (e.g., during static build)
    return null;
  }
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

// Singleton pattern — avoid creating multiple connections
const globalForDb = globalThis as unknown as { db: ReturnType<typeof createDb> };

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
