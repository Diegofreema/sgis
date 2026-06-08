import { cacheLife, cacheTag } from "next/cache";
import { db, admissionSettings } from "@/db";

export async function getAdmissionSettings() {
  "use cache";
  cacheLife("max");
  cacheTag("admission-settings");

  if (!db) return null;
  try {
    const result = await db.select().from(admissionSettings).limit(1);
    return result[0] ?? null;
  } catch {
    // Table may not exist yet — run: npx drizzle-kit generate && npx drizzle-kit migrate
    return null;
  }
}
