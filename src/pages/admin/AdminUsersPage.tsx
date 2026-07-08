import { useCallback, useEffect, useState } from "react";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { UsersAdminClient } from "@/components/admin/UsersAdminClient";
import { getAdminUsers, type AdminUser } from "@/lib/admin";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  const load = useCallback(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((e) => console.error("[admin users]", e));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!users) return <AdminLoading />;
  return <UsersAdminClient users={users} onCreated={load} />;
}
