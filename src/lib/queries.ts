import { supabase } from "@/lib/supabase/client";
import { siteConfig } from "@/config/site";
import type { Announcement, NewsArticle, GalleryItem } from "@/types/cms";

/**
 * Browser data layer — replaces legacy server/queries/* for the Vite SPA.
 * Reads go through the anon Supabase client and are governed by RLS.
 * Column aliases map snake_case DB columns to the camelCase the UI expects.
 */

const NEWS_COLS =
  "id, title, slug, featuredImageUrl:featured_image_url, excerpt, body, author, status, publishedAt:published_at, seoTitle:seo_title, seoDescription:seo_description, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

const GALLERY_COLS =
  "id, title, description, imageUrl:image_url, category, visibility, sortOrder:sort_order, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

const ANNOUNCEMENT_COLS =
  "id, title, slug, body, excerpt, audience, isImportant:is_important, status, publishedAt:published_at, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

const SETTINGS_COLS =
  "id, singletonKey:singleton_key, isOpen:is_open, academicSession:academic_session, applicationDeadline:application_deadline, notes, schoolName:school_name, schoolEmail:school_email, schoolPhone:school_phone, maintenanceMode:maintenance_mode, updatedBy:updated_by, updatedAt:updated_at";

const PERIOD_COLS =
  "id, title, description, applicationStartDate:application_start_date, applicationEndDate:application_end_date, examStartDate:exam_start_date, examEndDate:exam_end_date, registrationFee:registration_fee, currency, eligibleClasses:eligible_classes, status, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

// ─── CMS ────────────────────────────────────────────────────────────

export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from("announcements")
    .select(ANNOUNCEMENT_COLS)
    .eq("status", "published")
    .eq("audience", "public")
    .order("published_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as unknown as Announcement) ?? null;
}

export async function listNewsArticles(
  status: "published" | "draft" | "archived" = "published",
  limit = 20,
): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_COLS)
    .eq("status", status)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as NewsArticle[]) ?? [];
}

export async function getNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_COLS)
    .eq("slug", slug)
    .eq("status", "published")
    .limit(1);
  if (error) throw error;
  return (data?.[0] as unknown as NewsArticle) ?? null;
}

type ListGalleryItemsInput = number | { page?: number; pageSize?: number };

export async function countGalleryItems(): Promise<number> {
  const { count, error } = await supabase
    .from("gallery_items")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function listGalleryItems(
  input: ListGalleryItemsInput = 20,
): Promise<GalleryItem[]> {
  const page = typeof input === "number" ? 1 : Math.max(input.page ?? 1, 1);
  const pageSize = typeof input === "number" ? input : Math.max(input.pageSize ?? 20, 1);
  const from = (page - 1) * pageSize;

  const { data, error } = await supabase
    .from("gallery_items")
    .select(GALLERY_COLS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data as unknown as GalleryItem[]) ?? [];
}

// ─── Settings ───────────────────────────────────────────────────────

export type AdmissionSettings = {
  id: string;
  singletonKey: string;
  isOpen: boolean;
  academicSession: string;
  applicationDeadline: string | null;
  notes: string | null;
  schoolName: string | null;
  schoolEmail: string | null;
  schoolPhone: string | null;
  maintenanceMode: boolean;
  updatedBy: string | null;
  updatedAt: string;
};

export async function getAdmissionSettings(): Promise<AdmissionSettings | null> {
  // ponytail: admission_settings is a server-only table (RLS denies anon SELECT,
  // Postgres 42501). It can't be read from the browser — callers degrade to
  // siteConfig defaults / application_periods. Kept as a legacy-only feature.
  const { data, error } = await supabase.from("admission_settings").select(SETTINGS_COLS).limit(1);
  if (error) return null;
  return (data?.[0] as unknown as AdmissionSettings) ?? null;
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
    schoolPhones: settings?.schoolPhone?.trim()
      ? [settings.schoolPhone.trim()]
      : siteConfig.phones,
    maintenanceMode: settings?.maintenanceMode ?? false,
  };
}

// ─── Application periods ────────────────────────────────────────────

export type ApplicationPeriod = {
  id: string;
  title: string;
  description: string | null;
  applicationStartDate: string;
  applicationEndDate: string;
  examStartDate: string;
  examEndDate: string;
  registrationFee: string;
  currency: string;
  eligibleClasses: string[];
  status: "upcoming" | "open" | "closed" | "archived";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isApplicationPeriodActive(
  period: Pick<ApplicationPeriod, "status" | "applicationStartDate" | "applicationEndDate">,
  now = new Date(),
): boolean {
  return (
    period.status === "open" &&
    now >= new Date(period.applicationStartDate) &&
    now <= new Date(period.applicationEndDate)
  );
}

async function getOpenApplicationPeriods(): Promise<ApplicationPeriod[]> {
  const { data, error } = await supabase
    .from("application_periods")
    .select(PERIOD_COLS)
    .eq("status", "open")
    .order("application_start_date", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data as unknown as ApplicationPeriod[]) ?? [];
}

export async function getActiveApplicationPeriod(): Promise<ApplicationPeriod | null> {
  const result = await getOpenApplicationPeriods();
  return result.find((p) => isApplicationPeriodActive(p)) ?? null;
}

export async function getLatestOpenApplicationPeriod(): Promise<ApplicationPeriod | null> {
  const result = await getOpenApplicationPeriods();
  return result[0] ?? null;
}

export async function getAllApplicationPeriods(): Promise<ApplicationPeriod[]> {
  const { data, error } = await supabase
    .from("application_periods")
    .select(PERIOD_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ApplicationPeriod[]) ?? [];
}

export type PublicBankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  notes: string | null;
};

export async function getActiveBankAccounts(): Promise<PublicBankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, bankName:bank_name, accountName:account_name, accountNumber:account_number, notes")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as PublicBankAccount[]) ?? [];
}
