import { db, profiles } from "@/db";
import { eq } from "drizzle-orm";
import type { UserProfile } from "@/types/auth";
import { normalizeUserRole } from "@/constants/roles";

export function toUserProfile(p: typeof profiles.$inferSelect): UserProfile {
  return {
    id: p.id,
    authUserId: p.authUserId,
    parentProfileId: p.parentProfileId,
    role: normalizeUserRole(p.role),
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender as UserProfile["gender"],
    address: p.address,
    avatarUrl: p.avatarUrl,
    emailVerifiedAt: p.emailVerifiedAt?.toISOString() ?? null,
    requiresPasswordChange: p.requiresPasswordChange,
    passwordChangedAt: p.passwordChangedAt?.toISOString() ?? null,
    previousSchool: p.previousSchool,
    guardianName: p.guardianName,
    guardianPhone: p.guardianPhone,
    guardianEmail: p.guardianEmail,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getProfileByAuthId(
  authUserId: string
): Promise<UserProfile | null> {
  if (!db) return null;
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, authUserId))
    .limit(1);
  return result[0] ? toUserProfile(result[0]) : null;
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  if (!db) return null;
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  return result[0] ? toUserProfile(result[0]) : null;
}

export async function getProfileByEmail(email: string): Promise<UserProfile | null> {
  if (!db) return null;
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);
  return result[0] ? toUserProfile(result[0]) : null;
}

export async function listProfiles(filters?: { role?: UserProfile["role"]; parentProfileId?: string }) {
  if (!db) return [];
  if (filters?.role) {
    return db
      .select()
      .from(profiles)
      .where(eq(profiles.role, filters.role))
      .then((rows) => rows.map(toUserProfile));
  }
  if (filters?.parentProfileId) {
    return db
      .select()
      .from(profiles)
      .where(eq(profiles.parentProfileId, filters.parentProfileId))
      .then((rows) => rows.map(toUserProfile));
  }
  return (await db.select().from(profiles)).map(toUserProfile);
}
