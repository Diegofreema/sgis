import { supabase } from "@/lib/supabase/client";

/**
 * Admin applications list — supabase-js via admin RLS. Read-only list with
 * period filter + search + pagination (legacy listApplications/countApplications).
 */

export type ApplicationRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationCode: string;
  intendedClass: string;
  status: string;
  createdAt: string;
};

export type ExamAttemptRow = {
  applicationId: string;
  status: string;
  score: string | null;
  totalMarks: number | null;
  passed: boolean | null;
  createdAt: string;
};

const APP_COLS =
  "id, firstName:first_name, lastName:last_name, email, applicationCode:application_code, intendedClass:intended_class, status, createdAt:created_at";

type Filters = { periodId?: string; q?: string; page?: number; pageSize?: number };

// supabase-js filter builders are awkward to type through a helper; accept the
// chainable builder loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, f?: Filters): any {
  let q = query;
  if (f?.periodId) q = q.eq("application_period_id", f.periodId);
  if (f?.q) {
    const t = f.q.replace(/[%,]/g, "");
    q = q.or(
      `first_name.ilike.%${t}%,last_name.ilike.%${t}%,email.ilike.%${t}%,application_code.ilike.%${t}%`,
    );
  }
  return q;
}

export async function countApplications(filters?: Filters): Promise<number> {
  const base = supabase.from("applications").select("id", { count: "exact", head: true });
  const { count, error } = await applyFilters(base, filters);
  if (error) throw error;
  return count ?? 0;
}

export async function listApplications(filters?: Filters): Promise<ApplicationRow[]> {
  const page = Math.max(filters?.page ?? 1, 1);
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;

  const base = supabase
    .from("applications")
    .select(APP_COLS)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const { data, error } = await applyFilters(base, filters);
  if (error) throw error;
  return (data as unknown as ApplicationRow[]) ?? [];
}

export async function listExamAttemptsByApplications(
  applicationIds: string[],
): Promise<ExamAttemptRow[]> {
  if (applicationIds.length === 0) return [];
  const { data, error } = await supabase
    .from("exam_attempts")
    .select(
      "applicationId:application_id, status, score, totalMarks:total_marks, passed, createdAt:created_at",
    )
    .in("application_id", applicationIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ExamAttemptRow[]) ?? [];
}
