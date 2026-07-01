"use server";

import { db, admissionSettings } from "@/db";
import { requireRole } from "@/lib/auth";
import { updateTag } from "next/cache";
import { logActivity } from "@/lib/audit";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function isMissingSettingsSchemaError(error: unknown) {
  const code = (error as { cause?: { code?: string } }).cause?.code;
  return code === "42P01" || code === "42703";
}

export async function updateAdmissionSettings(input: {
  notes?: string;
}): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  try {
    await db
      .insert(admissionSettings)
      .values({
        singletonKey: "default",
        updatedBy: admin.id,
        notes: input.notes?.trim() || null,
      })
      .onConflictDoUpdate({
        target: admissionSettings.singletonKey,
        set: {
          notes: input.notes?.trim() || null,
          updatedBy: admin.id,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    if (isMissingSettingsSchemaError(error)) {
      return { success: false, error: "Settings table is out of date. Run the latest database migration." };
    }
    throw error;
  }

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: "settings.updated",
    entityType: "admission_settings",
    metadata: { notes: input.notes?.trim() || null },
  });

  updateTag("admission-settings");

  return { success: true, data: undefined };
}

export async function updateSchoolSettings(input: {
  schoolName: string;
  schoolEmail?: string;
  schoolPhone?: string;
  maintenanceMode: boolean;
}): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  try {
    await db
      .insert(admissionSettings)
      .values({
        singletonKey: "default",
        schoolName: input.schoolName.trim() || "Sankt Georg International School",
        schoolEmail: input.schoolEmail?.trim() || null,
        schoolPhone: input.schoolPhone?.trim() || null,
        maintenanceMode: input.maintenanceMode,
        updatedBy: admin.id,
      })
      .onConflictDoUpdate({
        target: admissionSettings.singletonKey,
        set: {
          schoolName: input.schoolName.trim() || "Sankt Georg International School",
          schoolEmail: input.schoolEmail?.trim() || null,
          schoolPhone: input.schoolPhone?.trim() || null,
          maintenanceMode: input.maintenanceMode,
          updatedBy: admin.id,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    if (isMissingSettingsSchemaError(error)) {
      return { success: false, error: "Settings table is out of date. Run the latest database migration." };
    }
    throw error;
  }

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: "settings.school_updated",
    entityType: "admission_settings",
    metadata: {
      schoolName: input.schoolName,
      schoolEmail: input.schoolEmail ?? null,
      schoolPhone: input.schoolPhone ?? null,
      maintenanceMode: input.maintenanceMode,
    },
  });

  updateTag("admission-settings");

  return { success: true, data: undefined };
}
