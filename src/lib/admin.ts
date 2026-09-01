import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile, type ActionResult } from "@/lib/auth";
import slugify from "slugify";
import type { Announcement, NewsArticle, StaffMember, Testimonial } from "@/types/cms";

const ANNOUNCEMENT_COLS =
  "id, title, slug, body, excerpt, audience, isImportant:is_important, status, publishedAt:published_at, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

const NEWS_COLS =
  "id, title, slug, featuredImageUrl:featured_image_url, excerpt, body, author, status, publishedAt:published_at, seoTitle:seo_title, seoDescription:seo_description, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

const STAFF_COLS =
  "id, name, role, imageUrl:image_url, isActive:is_active, sortOrder:sort_order, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

const TESTIMONIAL_COLS =
  "id, parentName:parent_name, content, isPublished:is_published, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

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
  let recentQuery = supabase
    .from("applications")
    .select("id, intendedClass:intended_class, createdAt:created_at, status")
    .order("created_at", { ascending: false })
    .limit(5);
  if (periodId) recentQuery = recentQuery.eq("application_period_id", periodId);

  // Grouped count in the DB — no application rows cross the wire (see
  // application_status_counts in the security-hardening migration).
  const [statusRes, announcementRes, recentRes] = await Promise.all([
    supabase.rpc("application_status_counts", { p_period: periodId ?? null }),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    recentQuery,
  ]);

  if (statusRes.error) throw statusRes.error;
  if (recentRes.error) throw recentRes.error;

  const counts: Record<string, number> = {};
  for (const row of (statusRes.data as { status: string; count: number }[] | null) ?? []) {
    counts[row.status] = Number(row.count);
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

// ─── News CRUD (admin RLS) ─────────────────────────────────────────

export async function listAllNewsArticles(): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select(NEWS_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as NewsArticle[]) ?? [];
}

type NewsInput = {
  title: string;
  excerpt?: string;
  body: string;
  author?: string;
  featuredImageUrl?: string;
  status: "draft" | "published" | "archived";
};

export async function createNewsArticle(
  input: NewsInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };

  const slug = slugify(input.title, { lower: true, strict: true }) + "-" + Date.now();
  const { data, error } = await supabase
    .from("news_articles")
    .insert({
      title: input.title,
      slug,
      excerpt: input.excerpt || null,
      body: input.body,
      author: input.author || null,
      featured_image_url: input.featuredImageUrl || null,
      status: input.status,
      created_by: profile.id,
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function updateNewsArticle(
  id: string,
  input: NewsInput,
): Promise<ActionResult> {
  const { error } = await supabase
    .from("news_articles")
    .update({
      title: input.title,
      excerpt: input.excerpt || null,
      body: input.body,
      author: input.author || null,
      featured_image_url: input.featuredImageUrl || null,
      status: input.status,
      published_at: input.status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteNewsArticle(id: string): Promise<ActionResult> {
  const { error, count } = await supabase
    .from("news_articles")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  if (!count) return { success: false, error: "News article not found." };
  return { success: true, data: undefined };
}

// ─── Testimonials CRUD (admin RLS) ─────────────────────────────────

export async function listAllTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select(TESTIMONIAL_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as Testimonial[]) ?? [];
}

type TestimonialInput = {
  parentName: string;
  content: string;
  isPublished: boolean;
};

export async function createTestimonial(
  input: TestimonialInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      parent_name: input.parentName,
      content: input.content,
      is_published: input.isPublished,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function updateTestimonial(
  id: string,
  input: TestimonialInput,
): Promise<ActionResult> {
  const { error } = await supabase
    .from("testimonials")
    .update({
      parent_name: input.parentName,
      content: input.content,
      is_published: input.isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  const { error, count } = await supabase
    .from("testimonials")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  if (!count) return { success: false, error: "Testimonial not found." };
  return { success: true, data: undefined };
}

// ─── Gallery (admin RLS + storage) ──────────────────────────────────

const GALLERY_BUCKET = "gallery";

function galleryPathFromUrl(url: string): string | null {
  const marker = `/public/${GALLERY_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

async function uploadPublicImage(
  formData: FormData,
  folder: "gallery" | "staff",
): Promise<ActionResult<{ path: string; url: string }>> {
  const file = formData.get("image");
  if (!(file instanceof File)) return { success: false, error: "No image provided." };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`;

  const { error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) return { success: false, error: error.message };

  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return { success: true, data: { path, url: data.publicUrl } };
}

export async function uploadGalleryImage(
  formData: FormData,
): Promise<ActionResult<{ path: string; url: string }>> {
  return uploadPublicImage(formData, "gallery");
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

// ─── Staff (admin RLS + storage) ────────────────────────────────────

export async function listAllStaffMembers(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from("staff_members")
    .select(STAFF_COLS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as StaffMember[]) ?? [];
}

export function uploadStaffImage(formData: FormData) {
  return uploadPublicImage(formData, "staff");
}

export async function createStaffMember(input: {
  name: string;
  role: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };
  const { data, error } = await supabase
    .from("staff_members")
    .insert({
      name: input.name,
      role: input.role,
      image_url: input.imageUrl,
      is_active: input.isActive,
      sort_order: input.sortOrder,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function updateStaffMember(
  id: string,
  input: {
    name: string;
    role: string;
    imageUrl?: string;
    isActive: boolean;
    sortOrder: number;
  },
): Promise<ActionResult> {
  const { data: oldRow } = input.imageUrl
    ? await supabase.from("staff_members").select("image_url").eq("id", id).single()
    : { data: null };
  const patch: Record<string, unknown> = {
    name: input.name,
    role: input.role,
    is_active: input.isActive,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  };
  if (input.imageUrl) patch.image_url = input.imageUrl;
  const { error } = await supabase.from("staff_members").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };
  const oldPath = oldRow?.image_url ? galleryPathFromUrl(oldRow.image_url) : null;
  if (oldPath) await supabase.storage.from(GALLERY_BUCKET).remove([oldPath]);
  return { success: true, data: undefined };
}

export async function deleteStaffMember(id: string): Promise<ActionResult> {
  const { data: row } = await supabase
    .from("staff_members")
    .select("image_url")
    .eq("id", id)
    .single();
  const path = row?.image_url ? galleryPathFromUrl(row.image_url) : null;
  if (path) await supabase.storage.from(GALLERY_BUCKET).remove([path]);

  const { error, count } = await supabase
    .from("staff_members")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  if (!count) return { success: false, error: "Staff member not found." };
  return { success: true, data: undefined };
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

// Create another admin account. Runs through the `admin-create-user` Edge
// Function (service role) — auth-user creation + profile insert need the
// service role and can't happen on the browser client. Admin-gated server-side.
// No password here: the function emails the new admin a link to set their own.
export async function createAdminUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<ActionResult> {
  const { data, error } = await supabase.functions.invoke("admin-create-user", { body: input });
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctxBody = await (error as any)?.context?.json?.().catch(() => null);
    return { success: false, error: ctxBody?.error ?? error.message ?? "Could not create the admin." };
  }
  if (data && data.success === false) {
    return { success: false, error: data.error ?? "Could not create the admin." };
  }
  return { success: true, data: undefined };
}

// ─── Activity log (audit trail) ─────────────────────────────────────────────

export type ActivityLog = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { firstName: string | null; lastName: string | null; email: string } | null;
};

const ACTIVITY_COLS =
  "id, action, entityType:entity_type, entityId:entity_id, metadata, createdAt:created_at, actor:profiles!activity_logs_actor_id_fkey(firstName:first_name, lastName:last_name, email)";

export async function getActivityLogs(
  page = 1,
  pageSize = 20,
): Promise<{ logs: ActivityLog[]; total: number }> {
  const from = (Math.max(page, 1) - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("activity_logs")
    .select(ACTIVITY_COLS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs = ((data as any[]) ?? []).map((r) => ({
    ...r,
    actor: Array.isArray(r.actor) ? (r.actor[0] ?? null) : r.actor,
  })) as ActivityLog[];
  return { logs, total: count ?? 0 };
}
