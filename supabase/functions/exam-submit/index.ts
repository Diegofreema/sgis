// POST /functions/v1/exam-submit
// Faithful port of legacy submitExam grading. Compares each answer to the
// secret correct_option (server-only), writes exam_answers + score, marks the
// attempt graded. The client never sees correct answers.
// Body: { token, attemptId, answers: [{ questionId, selectedOption }] }
// → { success, data: undefined }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok } from "../_shared/cors.ts";
import { getAssignedQuestions, resolveSession } from "../_shared/session.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    const attemptId = String(body.attemptId ?? "");
    const answers: Array<{ questionId: string; selectedOption: string | null }> =
      Array.isArray(body.answers) ? body.answers : [];

    const db = serviceClient();
    const now = new Date();

    const resolved = await resolveSession(db, token, now);
    if ("error" in resolved) return fail(resolved.error);
    const { application, exam } = resolved;

    const { data: attempt } = await db
      .from("exam_attempts")
      .select("id, exam_id, application_id, question_order, status, total_marks")
      .eq("id", attemptId)
      .maybeSingle();

    if (!attempt || attempt.application_id !== application.id) {
      return fail("Attempt not found.");
    }
    if (attempt.status === "submitted" || attempt.status === "graded") {
      return ok(undefined); // already finalised — idempotent
    }

    const assigned = await getAssignedQuestions(db, attempt.exam_id);
    if (assigned.length === 0) return fail("This exam has no assigned questions.");
    const questionMap = new Map(assigned.map((q) => [q!.id, q!]));
    const order: string[] = attempt.question_order ?? [];
    const allowed = new Set(order);

    // Upsert submitted selections (only for questions in this attempt).
    for (const a of answers) {
      if (!allowed.has(a.questionId)) continue;
      const selected = a.selectedOption?.trim().toLowerCase() ?? null;
      const { data: existing } = await db
        .from("exam_answers")
        .select("id")
        .eq("attempt_id", attemptId)
        .eq("question_id", a.questionId)
        .maybeSingle();
      if (existing) {
        await db
          .from("exam_answers")
          .update({ selected_option: selected, updated_at: now.toISOString() })
          .eq("id", existing.id);
      } else {
        await db
          .from("exam_answers")
          .insert({ attempt_id: attemptId, question_id: a.questionId, selected_option: selected });
      }
    }

    // Grade against the secret correct_option.
    const { data: answerRows } = await db
      .from("exam_answers")
      .select("id, question_id, selected_option")
      .eq("attempt_id", attemptId);
    const answerByQ = new Map((answerRows ?? []).map((r) => [r.question_id, r]));

    let totalScore = 0;
    for (const questionId of order) {
      const q = questionMap.get(questionId);
      if (!q) continue;
      const row = answerByQ.get(questionId);
      const selected = row?.selected_option ?? null;
      const isCorrect = selected === q.correct_option;
      const marksAwarded = isCorrect ? Number(q.marks) : 0;
      totalScore += marksAwarded;

      if (row) {
        await db
          .from("exam_answers")
          .update({
            is_correct: isCorrect,
            marks_awarded: String(marksAwarded),
            updated_at: now.toISOString(),
          })
          .eq("id", row.id);
      } else {
        await db.from("exam_answers").insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: null,
          is_correct: false,
          marks_awarded: "0",
        });
      }
    }

    const totalMarks = attempt.total_marks ??
      assigned.reduce((sum, q) => sum + Number(q!.marks), 0);
    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;

    await db
      .from("exam_attempts")
      .update({
        status: "graded",
        score: String(totalScore),
        passed: percentage >= exam.passing_score,
        submitted_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", attemptId);

    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error.", 500);
  }
});
