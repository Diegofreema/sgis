import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import DashboardLoading from "./dashboard/loading";

/**
 * Async sub-component — runs the dynamic auth check inside the Suspense
 * boundary so the static shell renders immediately without blocking.
 */
async function AuthedDashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AuthedDashboardContent>{children}</AuthedDashboardContent>
    </Suspense>
  );
}
