import { supabase } from "@/lib/supabase/client";

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
