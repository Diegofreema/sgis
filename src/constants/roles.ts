export const USER_ROLES = {
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  DISABLED: "disabled",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ADMIN_ROLES: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN];

export function isAdminRole(role: string | null | undefined): role is UserRole {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;
}

export function normalizeUserRole(role: string | null | undefined): UserRole {
  if (role === USER_ROLES.SUPER_ADMIN) return USER_ROLES.SUPER_ADMIN;
  if (role === USER_ROLES.DISABLED) return USER_ROLES.DISABLED;
  return USER_ROLES.ADMIN;
}
