import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile, type ActionResult } from "@/lib/auth";
import slugify from "slugify";
import type { Announcement } from "@/types/cms";

const ANNOUNCEMENT_COLS =
  "id, title, slug, body, excerpt, audience, isImportant:is_important, status, publishedAt:published_at, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

/**
 * Admin data layer — supabase-js as the authenticated admin, gated by the
 * `admin_all_*` RLS policies. Replaces the legacy server queries/actions that
 * ran Drizzle with the service role.
 */

export type AdminPeriod = { id: string; title: string };

export async function getAdminPeriods(): Promise<AdminPeriod[]> {
  const { data, error } = await supabase
    .from("application_periods")
    .select("id, title")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AdminPeriod[]) ?? [];
}

export type DashboardStats = {
  total: number;
  pending: number;
  approved: number;
  announcements: number;
};

export type RecentApplication = {
  id: string;
  intendedClass: string;
  createdAt: string;
  status: string;
};

export async function getDashboardData(periodId?: string): Promise<{
  stats: DashboardStats;
  recent: RecentApplication[];
}> {
  let statusQuery = supabase.from("applications").select("status");
  if (periodId) statusQuery = statusQuery.eq("application_period_id", periodId);

  let recentQuery = supabase
    .from("applications")
    .select("id, intendedClass:intended_class, createdAt:created_at, status")
    .order("created_at", { ascending: false })
    .limit(5);
  if (periodId) recentQuery = recentQuery.eq("application_period_id", periodId);

  const [statusRes, announcementRes, recentRes] = await Promise.all([
    statusQuery,
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    recentQuery,
  ]);

  if (statusRes.error) throw statusRes.error;
  if (recentRes.error) throw recentRes.error;

  const counts: Record<string, number> = {};
  for (const row of statusRes.data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  return {
    stats: {
      total,
      pending: (counts.pending ?? 0) + (counts.under_review ?? 0),
      approved: counts.approved ?? 0,
      announcements: announcementRes.count ?? 0,
    },
    recent: (recentRes.data as unknown as RecentApplication[]) ?? [],
  };
}

// ─── Announcements CRUD (admin RLS) ─────────────────────────────────

export async function listAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select(ANNOUNCEMENT_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Announcement[]) ?? [];
}

async function archiveOtherPublishedAnnouncements(exceptId?: string) {
  let q = supabase
    .from("announcements")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("status", "published");
  if (exceptId) q = q.neq("id", exceptId);
  await q;
}

type AnnouncementInput = {
  title: string;
  body: string;
  excerpt?: string;
  isImportant?: boolean;
  status?: "draft" | "published" | "archived";
};

export async function createAnnouncement(
  input: AnnouncementInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };
  if (input.status === "published") await archiveOtherPublishedAnnouncements();

  const slug = slugify(input.title, { lower: true, strict: true }) + "-" + Date.now();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: input.title,
      slug,
      body: input.body,
      excerpt: input.excerpt ?? null,
      audience: "public",
      is_important: input.isImportant ?? false,
      status: input.status ?? "draft",
      created_by: profile.id,
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput>,
): Promise<ActionResult> {
  if (input.status === "published") await archiveOtherPublishedAnnouncements(id);
  const patch: Record<string, unknown> = { ...input, audience: "public", updated_at: new Date().toISOString() };
  if ("isImportant" in input) {
    patch.is_important = input.isImportant;
    delete patch.isImportant;
  }
  if (input.status === "published") patch.published_at = new Date().toISOString();
  const { error } = await supabase.from("announcements").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const { error, count } = await supabase
    .from("announcements")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  if (!count) return { success: false, error: "Announcement not found." };
  return { success: true, data: undefined };
}

// ─── Gallery (admin RLS + storage) ──────────────────────────────────

const GALLERY_BUCKET = "gallery";

function galleryPathFromUrl(url: string): string | null {
  const marker = `/public/${GALLERY_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export async function uploadGalleryImage(
  formData: FormData,
): Promise<ActionResult<{ path: string; url: string }>> {
  const file = formData.get("image");
  if (!(file instanceof File)) return { success: false, error: "No image provided." };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const path = `gallery/${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`;

  const { error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) return { success: false, error: error.message };

  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return { success: true, data: { path, url: data.publicUrl } };
}

export async function deleteGalleryUpload(path: string): Promise<ActionResult> {
  const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([path]);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function createGalleryItemRecords(
  records: { imageUrl: string; title: string }[],
): Promise<ActionResult<{ count: number }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };
  const rows = records.map((r) => ({
    title: r.title,
    image_url: r.imageUrl,
    visibility: "public",
    created_by: profile.id,
  }));
  const { data, error } = await supabase.from("gallery_items").insert(rows).select("id");
  if (error) return { success: false, error: error.message };
  return { success: true, data: { count: data?.length ?? 0 } };
}

async function removeGalleryRows(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  if (ids.length === 0) return { success: true, data: { deleted: 0 } };
  // Best-effort storage cleanup, then delete rows.
  const { data: rows } = await supabase.from("gallery_items").select("image_url").in("id", ids);
  const paths = (rows ?? [])
    .map((r) => galleryPathFromUrl(r.image_url))
    .filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(GALLERY_BUCKET).remove(paths);

  const { error, count } = await supabase
    .from("gallery_items")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) return { success: false, error: error.message };
  return { success: true, data: { deleted: count ?? 0 } };
}

export function deleteGalleryItem(id: string) {
  return removeGalleryRows([id]);
}

export function deleteGalleryItems(ids: string[]) {
  return removeGalleryRows(ids);
}

export async function deleteAllGalleryItems(): Promise<ActionResult<{ deleted: number }>> {
  const { data: rows } = await supabase.from("gallery_items").select("id");
  return removeGalleryRows((rows ?? []).map((r) => r.id));
}

// ─── Users (admin list, read-only) ──────────────────────────────────

export type AdminUser = {
  id: string;
  authUserId: string;
  role: "admin";
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  state: string | null;
  lga: string | null;
  createdAt: string;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, authUserId:auth_user_id, role, firstName:first_name, lastName:last_name, email, phone, state, lga, createdAt:created_at",
    )
    .eq("role", "admin")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as AdminUser[]) ?? [];
}
