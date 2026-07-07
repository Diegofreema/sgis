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
