// POST /functions/v1/exam-discovery
// Public exam info for a session (legacy getPublicExamDiscovery). Exam tables
// are service-role-only; returns exam metadata WITHOUT questions/answers.
// Body: { periodId } → { success, data: { state, period, exam, previewOpensAt, verificationOpensAt } }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok, serverError } from "../_shared/cors.ts";
import { getPublicExamWindow } from "../_shared/exam-window.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { periodId } = await req.json();
    const id = String(periodId ?? "");
    const base = { period: null, exam: null, previewOpensAt: null, verificationOpensAt: null };
    if (!id) return ok({ state: "not_found", ...base });

    const db = serviceClient();

    const { data: period } = await db
      .from("application_periods")
      .select("id, title, examStartDate:exam_start_date, examEndDate:exam_end_date")
      .eq("id", id)
      .maybeSingle();
    if (!period) return ok({ state: "not_found", ...base });

    const { data: exam } = await db
      .from("exams")
      .select("id, title, instructions, durationMinutes:duration_minutes, totalMarks:total_marks, passingScore:passing_score, status")
      .eq("application_period_id", period.id)
      .eq("status", "active")
      .maybeSingle();
    if (!exam) {
      return ok({ state: "no_exam_for_session", period, exam: null, previewOpensAt: null, verificationOpensAt: null });
    }

    const w = getPublicExamWindow({ examStartDate: period.examStartDate, examEndDate: period.examEndDate });
    const previewOpensAt = w.previewOpensAt.toISOString();
    const verificationOpensAt = w.verificationOpensAt.toISOString();
    const stateByPhase: Record<string, string> = {
      too_early: "preview_locked",
      preview: "preview_open",
      verification: "verification_open",
      live: "live",
      closed: "exam_closed",
    };
    return ok({ state: stateByPhase[w.phase], period, exam, previewOpensAt, verificationOpensAt });
  } catch (error) {
    return serverError("exam-discovery", error);
  }
});
