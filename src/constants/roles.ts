export const USER_ROLES = {
  ADMIN: "admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ADMIN_ROLES: UserRole[] = [USER_ROLES.ADMIN];

export function isAdminRole(role: string | null | undefined): role is UserRole {
  return role === USER_ROLES.ADMIN;
}

export function normalizeUserRole(role: string | null | undefined): UserRole {
  void role;
  return USER_ROLES.ADMIN;
}
