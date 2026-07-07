import { requireRole } from "@/lib/auth";
import { db, profiles } from "@/db";
import { desc, eq } from "drizzle-orm";
import { UsersAdminClient } from "./UsersAdminClient";

export default async function AdminUsersPage() {
  await requireRole(["admin"]);

  const rows = db
    ? await db
        .select({
          id: profiles.id,
          authUserId: profiles.authUserId,
          role: profiles.role,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          email: profiles.email,
          phone: profiles.phone,
          state: profiles.state,
          lga: profiles.lga,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .where(eq(profiles.role, "admin"))
        .orderBy(desc(profiles.createdAt))
    : [];

  return <UsersAdminClient users={rows} />;
}
