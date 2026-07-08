import { useCallback, useEffect, useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { StaffAdminClient } from "@/components/admin/StaffAdminClient";
import { listAllStaffMembers } from "@/lib/admin";
import type { StaffMember } from "@/types/cms";

export function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);

  const load = useCallback(() => {
    listAllStaffMembers()
      .then(setStaff)
      .catch((e) => console.error("[admin staff]", e));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!staff) return <AdminLoading />;

  return (
    <FadeIn>
      <StaffAdminClient staff={staff} onChanged={load} />
    </FadeIn>
  );
}
