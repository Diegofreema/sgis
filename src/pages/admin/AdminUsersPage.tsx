import { useEffect, useState } from "react";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { UsersAdminClient } from "@/components/admin/UsersAdminClient";
import { getAdminUsers, type AdminUser } from "@/lib/admin";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((e) => console.error("[admin users]", e));
  }, []);

  if (!users) return <AdminLoading />;
  return <UsersAdminClient users={users} />;
}
