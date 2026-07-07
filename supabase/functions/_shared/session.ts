// Validate an exam session token (the verified public_exam_access_sessions id)
// and load the associated application / period / exam. Used by exam-start and
// exam-submit. Mirrors legacy getVerifiedPublicExamAccess (token instead of
// httpOnly cookie).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ResolvedSession = {
  session: { id: string; application_id: string; exam_id: string };
  application: { id: string; status: string; application_code: string };
  period: { id: string; exam_start_date: string; exam_end_date: string };
  exam: {
    id: string;
    status: string;
    duration_minutes: number;
    total_marks: number;
    passing_score: number;
  };
};

export async function resolveSession(
  db: SupabaseClient,
  token: string,
  now = new Date(),
): Promise<ResolvedSession | { error: string }> {
  if (!token) return { error: "Exam session missing. Verify your access again." };

  const { data: session } = await db
    .from("public_exam_access_sessions")
    .select("id, application_id, application_period_id, exam_id, verified_at, session_expires_at, revoked_at")
    .eq("id", token)
    .maybeSingle();

  if (!session || session.revoked_at || !session.verified_at) {
    return { error: "Exam session invalid. Verify your access again." };
  }
  if (session.session_expires_at && new Date(session.session_expires_at) < now) {
    return { error: "Exam session expired. Verify your access again." };
  }

  const [{ data: application }, { data: period }, { data: exam }] = await Promise.all([
    db.from("applications").select("id, status, application_code").eq("id", session.application_id).maybeSingle(),
    db
      .from("application_periods")
      .select("id, exam_start_date, exam_end_date")
      .eq("id", session.application_period_id)
      .maybeSingle(),
    db
      .from("exams")
      .select("id, status, duration_minutes, total_marks, passing_score")
      .eq("id", session.exam_id)
      .maybeSingle(),
  ]);

  if (
    !application || !period || !exam ||
    application.status !== "approved" || exam.status !== "active"
  ) {
    return { error: "This exam is no longer available." };
  }

  return { session, application, period, exam };
}

/** Assigned questions for an exam (exam_questions join, legacy fallback). */
export async function getAssignedQuestions(db: SupabaseClient, examId: string) {
  const { data: assignments } = await db
    .from("exam_questions")
    .select("question_id, sort_order")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: true });

  if (assignments && assignments.length > 0) {
    const ids = assignments.map((a) => a.question_id);
    const { data: qs } = await db.from("questions").select("*").in("id", ids);
    const map = new Map((qs ?? []).map((q) => [q.id, q]));
    return assignments.map((a) => map.get(a.question_id)).filter(Boolean);
  }

  // Legacy fallback: questions.exam_id directly.
  const { data: legacy } = await db
    .from("questions")
    .select("*")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: true });
  return legacy ?? [];
}
