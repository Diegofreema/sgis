export const USER_ROLES = {
  STUDENT: "student",
  PARENT: "parent",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ADMIN_ROLES: UserRole[] = [USER_ROLES.ADMIN];

export function isAdminRole(role: string | null | undefined): role is UserRole {
  return role === USER_ROLES.ADMIN;
}

export function isStudentOrParent(role: string | null | undefined): boolean {
  return role === USER_ROLES.STUDENT || role === USER_ROLES.PARENT;
}

export function normalizeUserRole(role: string | null | undefined): UserRole {
  if (role === USER_ROLES.PARENT) return USER_ROLES.PARENT;
  if (role === USER_ROLES.ADMIN || role === "super_admin") return USER_ROLES.ADMIN;
  return USER_ROLES.STUDENT;
}
