"use server";

import { db, admissionSettings } from "@/db";
import { requireRole } from "@/lib/auth";
import { updateTag } from "next/cache";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function updateAdmissionSettings(input: {
  isOpen: boolean;
  academicSession: string;
  notes?: string;
}): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .insert(admissionSettings)
    .values({
      singletonKey: "default",
      isOpen: input.isOpen,
      academicSession: input.academicSession.trim(),
      notes: input.notes?.trim() || null,
      updatedBy: admin.id,
    })
    .onConflictDoUpdate({
      target: admissionSettings.singletonKey,
      set: {
        isOpen: input.isOpen,
        academicSession: input.academicSession.trim(),
        notes: input.notes?.trim() || null,
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

  updateTag("admission-settings");

  return { success: true, data: undefined };
}
