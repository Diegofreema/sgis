import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile, type ActionResult } from "@/lib/auth";
import type { QuestionBankItem } from "@/lib/admin-questions";

/**
 * Exam management — supabase-js via admin RLS. Faithful ports of the legacy
 * exam server actions (create/edit/status + question assignment + total-marks
 * sync). Result emails need a server mailer — see sendBulkResultEmails.
 */

export type AdminExam = {
  id: string;
  applicationPeriodId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingScore: number;
  randomizeQuestions: boolean;
  showResultImmediately: boolean;
  resultReleaseDate: string | null;
  status: "draft" | "active" | "closed" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const EXAM_COLS =
  "id, applicationPeriodId:application_period_id, title, description, instructions, durationMinutes:duration_minutes, totalMarks:total_marks, passingScore:passing_score, randomizeQuestions:randomize_questions, showResultImmediately:show_result_immediately, resultReleaseDate:result_release_date, status, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

const Q_COLS =
  "id, examId:exam_id, questionText:question_text, questionImageUrl:question_image_url, options, correctOption:correct_option, explanation, marks, difficulty, subject, type, sortOrder:sort_order, createdAt:created_at, updatedAt:updated_at";

export type ExamListItem = {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  totalMarks: number;
  passingScore: number;
  createdAt: string;
  updatedAt: string;
  attempts: number;
};

export async function getExamsList(): Promise<ExamListItem[]> {
  const [{ data: exams, error }, { data: attempts }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, title, status, durationMinutes:duration_minutes, totalMarks:total_marks, passingScore:passing_score, createdAt:created_at, updatedAt:updated_at")
      .order("created_at", { ascending: false }),
    supabase.from("exam_attempts").select("exam_id"),
  ]);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const a of attempts ?? []) counts.set(a.exam_id, (counts.get(a.exam_id) ?? 0) + 1);
  return (exams ?? []).map((e) => ({ ...(e as Omit<ExamListItem, "attempts">), attempts: counts.get(e.id) ?? 0 }));
}

export async function getExamForAdmin(
  id: string,
): Promise<{ exam: AdminExam; questions: QuestionBankItem[] } | null> {
  const { data: exam } = await supabase.from("exams").select(EXAM_COLS).eq("id", id).maybeSingle();
  if (!exam) return null;

  const { data: assignments } = await supabase
    .from("exam_questions")
    .select("question_id, sort_order")
    .eq("exam_id", id)
    .order("sort_order", { ascending: true });
  let questions: QuestionBankItem[] = [];
  if (assignments && assignments.length > 0) {
    const ids = assignments.map((a) => a.question_id);
    const { data: qs } = await supabase.from("questions").select(Q_COLS).in("id", ids);
    const map = new Map((qs ?? []).map((q) => [(q as QuestionBankItem).id, q as QuestionBankItem]));
    questions = assignments.map((a) => map.get(a.question_id)).filter(Boolean) as QuestionBankItem[];
  }
  return { exam: exam as unknown as AdminExam, questions };
}

export async function getExamSessions() {
  const { data, error } = await supabase
    .from("application_periods")
    .select("id, title, examStartDate:exam_start_date, examEndDate:exam_end_date, status")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getQuestionBankAll(): Promise<QuestionBankItem[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(Q_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as QuestionBankItem[]) ?? [];
}

async function periodEndOk(periodId: string): Promise<string | null> {
  const { data } = await supabase
    .from("application_periods")
    .select("exam_start_date, exam_end_date")
    .eq("id", periodId)
    .maybeSingle();
  if (!data) return "Select a valid session for this exam.";
  if (new Date(data.exam_end_date) < new Date()) return "Past sessions cannot have new exams.";
  return null;
}

async function syncExamTotalMarks(examId: string) {
  const { data: assignments } = await supabase
    .from("exam_questions")
    .select("question_id")
    .eq("exam_id", examId);
  const ids = (assignments ?? []).map((a) => a.question_id);
  let total = 0;
  if (ids.length) {
    const { data: qs } = await supabase.from("questions").select("marks").in("id", ids);
    total = Math.round((qs ?? []).reduce((s, q) => s + Number(q.marks), 0));
  }
  await supabase.from("exams").update({ total_marks: total, updated_at: new Date().toISOString() }).eq("id", examId);
  return total;
}

export async function createExam(input: {
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  passingScore: number;
  applicationPeriodId: string;
}): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };
  const err = await periodEndOk(input.applicationPeriodId);
  if (err) return { success: false, error: err };

  const { data, error } = await supabase
    .from("exams")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      instructions: input.instructions?.trim() || null,
      duration_minutes: input.durationMinutes,
      passing_score: input.passingScore,
      total_marks: 0,
      randomize_questions: false,
      show_result_immediately: false,
      application_period_id: input.applicationPeriodId,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function updateExam(
  examId: string,
  input: {
    title?: string;
    description?: string;
    instructions?: string;
    durationMinutes?: number;
    passingScore?: number;
    applicationPeriodId?: string;
  },
): Promise<ActionResult> {
  if (input.applicationPeriodId) {
    const err = await periodEndOk(input.applicationPeriodId);
    if (err) return { success: false, error: err };
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim() || null;
  if (input.instructions !== undefined) patch.instructions = input.instructions.trim() || null;
  if (input.durationMinutes !== undefined) patch.duration_minutes = input.durationMinutes;
  if (input.passingScore !== undefined) patch.passing_score = input.passingScore;
  if (input.applicationPeriodId !== undefined) patch.application_period_id = input.applicationPeriodId;
  const { error } = await supabase.from("exams").update(patch).eq("id", examId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updateExamWindow(input: {
  periodId: string;
  examStartDate: string;
  examEndDate: string;
}): Promise<ActionResult> {
  const start = new Date(input.examStartDate);
  const end = new Date(input.examEndDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, error: "Enter valid exam date and time values." };
  }
  if (start >= end) return { success: false, error: "Exam end time must be after the start time." };
  const { error } = await supabase
    .from("application_periods")
    .update({ exam_start_date: start.toISOString(), exam_end_date: end.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", input.periodId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updateExamStatus(
  examId: string,
  status: "draft" | "active" | "closed" | "archived",
): Promise<ActionResult> {
  const { data: current } = await supabase
    .from("exams")
    .select("application_period_id")
    .eq("id", examId)
    .maybeSingle();
  if (!current) return { success: false, error: "Exam not found." };

  if (status === "active") {
    const { data: period } = await supabase
      .from("application_periods")
      .select("exam_start_date, exam_end_date")
      .eq("id", current.application_period_id)
      .maybeSingle();
    if (!period) return { success: false, error: "Exam session not found." };
    if (new Date(period.exam_start_date) <= new Date()) {
      return { success: false, error: "The exam start date must be in the future before activating." };
    }
    if (new Date(period.exam_end_date) < new Date()) {
      return { success: false, error: "This session exam window has already passed." };
    }
    const { data: assigned } = await supabase
      .from("exam_questions")
      .select("question_id")
      .eq("exam_id", examId)
      .limit(1);
    if (!assigned || assigned.length === 0) {
      return { success: false, error: "Assign at least one question before activating this exam." };
    }
    await syncExamTotalMarks(examId);
    // Only one active exam per session.
    await supabase
      .from("exams")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("application_period_id", current.application_period_id)
      .eq("status", "active")
      .neq("id", examId);
  }

  const { error } = await supabase
    .from("exams")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", examId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

async function getAssignedQuestionIds(examId: string): Promise<string[]> {
  const { data } = await supabase.from("exam_questions").select("question_id").eq("exam_id", examId);
  return (data ?? []).map((r) => r.question_id);
}

export async function assignQuestionsToExam(
  examId: string,
  questionIds: string[],
): Promise<ActionResult<{ assigned: number }>> {
  if (questionIds.length === 0) return { success: true, data: { assigned: 0 } };
  const existing = new Set(await getAssignedQuestionIds(examId));
  const next = [...new Set(questionIds)].filter((id) => !existing.has(id));
  if (next.length === 0) return { success: true, data: { assigned: 0 } };

  const { data: last } = await supabase
    .from("exam_questions")
    .select("sort_order")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const base = last?.sort_order ?? -1;

  const { error } = await supabase
    .from("exam_questions")
    .insert(next.map((questionId, i) => ({ exam_id: examId, question_id: questionId, sort_order: base + i + 1 })));
  if (error) return { success: false, error: error.message };
  await syncExamTotalMarks(examId);
  return { success: true, data: { assigned: next.length } };
}

export async function removeQuestionFromExam(examId: string, questionId: string): Promise<ActionResult> {
  const { error } = await supabase
    .from("exam_questions")
    .delete()
    .eq("exam_id", examId)
    .eq("question_id", questionId);
  if (error) return { success: false, error: error.message };
  await syncExamTotalMarks(examId);
  return { success: true, data: undefined };
}

export async function randomlyAssignQuestionsToExam(input: {
  examId: string;
  count: number;
  subject?: string;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<ActionResult<{ assigned: number }>> {
  const all = await getQuestionBankAll();
  const assigned = new Set(await getAssignedQuestionIds(input.examId));
  const candidates = all.filter((q) => {
    if (assigned.has(q.id)) return false;
    if (input.subject?.trim() && (q.subject ?? "") !== input.subject.trim()) return false;
    if (input.difficulty && q.difficulty !== input.difficulty) return false;
    return true;
  });
  const picked = [...candidates].sort(() => Math.random() - 0.5).slice(0, Math.max(0, input.count)).map((q) => q.id);
  return assignQuestionsToExam(input.examId, picked);
}

export async function releaseResults(
  examId: string,
  releaseDate?: string,
): Promise<ActionResult> {
  const d = releaseDate ? new Date(releaseDate) : new Date();
  if (Number.isNaN(d.getTime())) return { success: false, error: "Enter a valid release date." };
  const { error } = await supabase
    .from("exams")
    .update({ result_release_date: d.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", examId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// ponytail: bulk result emails need a server mailer (attempts read + Resend).
// Not exposed to the browser; add a `send-result-emails` Edge Function to enable.
export async function sendBulkResultEmails(_examId: string): Promise<ActionResult<{ sent: number }>> {
  return {
    success: false,
    error: "Result emails require a server mailer (add a send-result-emails Edge Function).",
  };
}

// ─── Exam results (read-only) ───────────────────────────────────────

export type ExamResultRow = {
  id: string;
  applicationCode: string;
  applicantName: string;
  applicantEmail: string;
  status: string;
  score: string | null;
  totalMarks: number | null;
  passed: boolean | null;
  submittedAt: string | null;
  startedAt: string;
};

export async function getExamTitle(examId: string): Promise<string | null> {
  const { data } = await supabase.from("exams").select("title").eq("id", examId).maybeSingle();
  return data?.title ?? null;
}

export async function listExamResults(
  examId: string,
  input: { page?: number; pageSize?: number },
): Promise<{ rows: ExamResultRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.max(1, input.pageSize ?? 20);
  const page = Math.max(1, input.page ?? 1);
  const from = (page - 1) * pageSize;

  const { data, count, error } = await supabase
    .from("exam_attempts")
    .select(
      "id, status, score, totalMarks:total_marks, passed, submittedAt:submitted_at, startedAt:started_at, applications!inner(applicationCode:application_code, firstName:first_name, lastName:last_name, email)",
      { count: "exact" },
    )
    .eq("exam_id", examId)
    .order("submitted_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;

  type AppEmbed = { applicationCode: string; firstName: string; lastName: string; email: string };
  const rows: ExamResultRow[] = (data ?? []).map((raw) => {
    const r = raw as unknown as {
      id: string;
      status: string;
      score: string | null;
      totalMarks: number | null;
      passed: boolean | null;
      submittedAt: string | null;
      startedAt: string;
      applications: AppEmbed | AppEmbed[];
    };
    const app = (Array.isArray(r.applications) ? r.applications[0] : r.applications) as AppEmbed | undefined;
    return {
      id: r.id,
      applicationCode: app?.applicationCode ?? "",
      applicantName: `${app?.firstName ?? ""} ${app?.lastName ?? ""}`.trim(),
      applicantEmail: app?.email ?? "",
      status: r.status,
      score: r.score,
      totalMarks: r.totalMarks,
      passed: r.passed,
      submittedAt: r.submittedAt,
      startedAt: r.startedAt,
    };
  });
  return { rows, total: count ?? 0, page, pageSize };
}
