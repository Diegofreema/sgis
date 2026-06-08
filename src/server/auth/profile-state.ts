import { db, profiles } from "@/db";
import { eq } from "drizzle-orm";

export async function markProfileEmailVerified(
  authUserId: string,
  verifiedAt = new Date()
) {
  if (!db) return;

  await db
    .update(profiles)
    .set({
      emailVerifiedAt: verifiedAt,
      updatedAt: new Date(),
    })
    .where(eq(profiles.authUserId, authUserId));
}

export async function markPasswordChanged(
  authUserId: string,
  changedAt = new Date()
) {
  if (!db) return;

  await db
    .update(profiles)
    .set({
      emailVerifiedAt: changedAt,
      requiresPasswordChange: false,
      passwordChangedAt: changedAt,
      updatedAt: new Date(),
    })
    .where(eq(profiles.authUserId, authUserId));
}
