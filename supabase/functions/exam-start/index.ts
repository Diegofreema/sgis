// POST /functions/v1/exam-start
// Faithful port of legacy startPublicExamAttempt + getExamForStudent. Creates
// (or resumes) the attempt and returns the exam + questions WITHOUT
// correct_option / explanation. Answer secrecy lives here.
// Body: { token } → { success, data: { attemptId, exam, questions, expiresAt } }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok } from "../_shared/cors.ts";
import { getPublicExamWindow, shuffle } from "../_shared/exam-window.ts";
import { getAssignedQuestions, resolveSession } from "../_shared/session.ts";

const COMPLETED = new Set(["submitted", "graded", "expired"]);

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { token } = await req.json();
    const db = serviceClient();
    const now = new Date();

    const resolved = await resolveSession(db, String(token ?? ""), now);
    if ("error" in resolved) return fail(resolved.error);
    const { application, period, exam } = resolved;

    const window = getPublicExamWindow(
      { examStartDate: period.exam_start_date, examEndDate: period.exam_end_date },
      now,
    );
    if (window.phase === "closed") return fail("Exam window has closed.");
    if (window.phase !== "live") return fail("Exam has not started yet.");

    // Existing attempt?
    const { data: existing } = await db
      .from("exam_attempts")
      .select("id, status, question_order, expires_at")
      .eq("exam_id", exam.id)
      .eq("application_id", application.id)
      .maybeSingle();

    let attemptId: string;
    let questionOrder: string[];
    let expiresAt: string;

    if (existing) {
      if (COMPLETED.has(existing.status)) return fail("This exam has already been completed.");
      attemptId = existing.id;
      questionOrder = existing.question_order ?? [];
      expiresAt = existing.expires_at;
    } else {
      const assigned = await getAssignedQuestions(db, exam.id);
      if (assigned.length === 0) return fail("This exam has no assigned questions.");
      questionOrder = shuffle(assigned.map((q) => q!.id));
      expiresAt = new Date(now.getTime() + exam.duration_minutes * 60 * 1000).toISOString();

      const { data: created, error } = await db
        .from("exam_attempts")
        .insert({
          exam_id: exam.id,
          application_id: application.id,
          user_id: null,
          started_at: now.toISOString(),
          expires_at: expiresAt,
          question_order: questionOrder,
          status: "in_progress",
          total_marks: exam.total_marks,
        })
        .select("id")
        .single();
      if (error || !created) return fail(error?.message ?? "Could not start exam.");
      attemptId = created.id;
    }

    // Serve questions in attempt order, WITHOUT correct_option / explanation.
    const assigned = await getAssignedQuestions(db, exam.id);
    const byId = new Map(assigned.map((q) => [q!.id, q!]));
    const questions = questionOrder
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((q) => ({
        id: q!.id,
        questionText: q!.question_text,
        questionImageUrl: q!.question_image_url,
        options: q!.options,
        marks: Number(q!.marks),
        subject: q!.subject,
        type: q!.type,
      }));

    return ok({ attemptId, expiresAt, exam, questions });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error.", 500);
  }
});
