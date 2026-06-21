import type { UserRole } from "@/constants/roles";

export type UserProfile = {
  id: string;
  authUserId: string;
  parentProfileId: string | null;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  requiresPasswordChange: boolean;
  passwordChangedAt: string | null;
  // Extended profile fields
  previousSchool: string | null;
  state: string | null;
  lga: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
  profile: UserProfile | null;
};
