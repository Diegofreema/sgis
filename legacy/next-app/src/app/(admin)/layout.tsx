import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import AdminLoading from "./admin/loading";

/**
 * Async sub-component — runs the dynamic role check inside the Suspense
 * boundary so the static shell renders immediately without blocking.
 */
async function AuthedAdminContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["admin"]);
  return <AdminShell profile={profile}>{children}</AdminShell>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AuthedAdminContent>{children}</AuthedAdminContent>
    </Suspense>
  );
}
