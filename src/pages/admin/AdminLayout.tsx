import { Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { useProfile } from "@/lib/auth";

/**
 * Admin route-group layout (legacy app/(admin)/layout.tsx). The admin-only
 * guard runs in the route's beforeLoad; here we resolve the profile for the
 * shell (sidebar/topbar) and show the skeleton while it loads.
 */
export function AdminLayout() {
  const { profile, loading } = useProfile();

  if (loading || !profile) return <AdminLoading />;

  return (
    <AdminShell profile={profile}>
      <Outlet />
    </AdminShell>
  );
}
