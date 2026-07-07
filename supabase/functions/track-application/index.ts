// POST /functions/v1/track-application
// Public application tracking by code (legacy getPublicExamAccess). Applications
// are admin-only under RLS, so this runs with the service role and returns only
// the applicant-facing fields.
// Body: { applicationCode } → { success, data: { state, application, period, exam, attempt } }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { applicationCode } = await req.json();
    const code = String(applicationCode ?? "").trim().toUpperCase();
    if (!code) return fail("Enter an application ID.");

    const db = serviceClient();
    const now = new Date();

    const { data: application } = await db
      .from("applications")
      .select("id, applicationCode:application_code, firstName:first_name, lastName:last_name, status, submittedAt:submitted_at, rejectionReason:rejection_reason, application_period_id")
      .eq("application_code", code)
      .maybeSingle();

    const empty = { application: null, period: null, exam: null, attempt: null };
    if (!application) return ok({ state: "not_found", ...empty });

    const { data: period } = await db
      .from("application_periods")
      .select("id, title, examStartDate:exam_start_date, examEndDate:exam_end_date")
      .eq("id", application.application_period_id)
      .maybeSingle();
    if (!period) return ok({ state: "no_exam_for_session", application, period: null, exam: null, attempt: null });

    if (application.status !== "approved") {
      return ok({ state: "not_approved", application, period, exam: null, attempt: null });
    }

    const { data: exam } = await db
      .from("exams")
      .select("id, title, passingScore:passing_score, status")
      .eq("application_period_id", period.id)
      .eq("status", "active")
      .maybeSingle();
    if (!exam) return ok({ state: "no_exam_for_session", application, period, exam: null, attempt: null });

    const { data: attempt } = await db
      .from("exam_attempts")
      .select("id, status, score, totalMarks:total_marks, passed")
      .eq("application_id", application.id)
      .eq("exam_id", exam.id)
      .maybeSingle();

    const st = attempt?.status;
    if (st === "submitted" || st === "graded") return ok({ state: "submitted", application, period, exam, attempt });
    if (st === "in_progress") return ok({ state: "in_progress", application, period, exam, attempt });

    if (now < new Date(period.examStartDate)) return ok({ state: "exam_not_started", application, period, exam, attempt });
    if (now > new Date(period.examEndDate)) return ok({ state: "exam_closed", application, period, exam, attempt });
    return ok({ state: "ready", application, period, exam, attempt });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error.", 500);
  }
});
