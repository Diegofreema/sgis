import { redirect } from "next/navigation";
import { requireAuth, requireOwnedStudent } from "@/lib/auth";
import type { UserProfile } from "@/types/auth";

export type ManagedProfileContext = {
  actor: UserProfile;
  target: UserProfile;
  isManagingStudent: boolean;
};

export async function resolveManagedProfileContext(
  targetProfileId?: string | null
): Promise<ManagedProfileContext> {
  const actor = await requireAuth();

  if (!targetProfileId || targetProfileId === actor.id) {
    return {
      actor,
      target: actor,
      isManagingStudent: false,
    };
  }

  if (actor.role !== "parent") {
    redirect(actor.role === "admin" ? "/admin" : "/dashboard");
  }

  const target = await requireOwnedStudent(actor.id, targetProfileId);
  return {
    actor,
    target,
    isManagingStudent: true,
  };
}
