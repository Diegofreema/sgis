import { cacheLife, cacheTag } from "next/cache";
import { db, admissionSettings } from "@/db";
import { siteConfig } from "@/config/site";

function isMissingTableError(error: unknown) {
  return (error as { cause?: { code?: string } }).cause?.code === "42P01";
}

function isMissingColumnError(error: unknown) {
  return (error as { cause?: { code?: string } }).cause?.code === "42703";
}

export async function getAdmissionSettings() {
  "use cache";
  cacheLife("max");
  cacheTag("admission-settings");

  if (!db) return null;
  try {
    const result = await db.select().from(admissionSettings).limit(1);
    return result[0] ?? null;
  } catch (error) {
    if (isMissingColumnError(error)) {
      const legacyResult = await db
        .select({
          id: admissionSettings.id,
          singletonKey: admissionSettings.singletonKey,
          isOpen: admissionSettings.isOpen,
          academicSession: admissionSettings.academicSession,
          applicationDeadline: admissionSettings.applicationDeadline,
          notes: admissionSettings.notes,
          updatedBy: admissionSettings.updatedBy,
          updatedAt: admissionSettings.updatedAt,
        })
        .from(admissionSettings)
        .limit(1);
      const legacy = legacyResult[0];
      return legacy
        ? {
            ...legacy,
            schoolName: "Sankt Georg International School",
            schoolEmail: null,
            schoolPhone: null,
            maintenanceMode: false,
          }
        : null;
    }
    if (!isMissingTableError(error)) throw error;
    // Table may not exist yet — run: npx drizzle-kit generate && npx drizzle-kit migrate
    return null;
  }
}

export async function getPublicSchoolSettings() {
  const settings = await getAdmissionSettings();
  const schoolName = settings?.schoolName?.trim() || siteConfig.name;
  const schoolEmail = settings?.schoolEmail?.trim() || siteConfig.email;
  const schoolPhone = settings?.schoolPhone?.trim() || siteConfig.phone;

  return {
    schoolName,
    schoolEmail,
    schoolPhone,
    schoolPhones: settings?.schoolPhone?.trim() ? [settings.schoolPhone.trim()] : siteConfig.phones,
    maintenanceMode: settings?.maintenanceMode ?? false,
  };
}
