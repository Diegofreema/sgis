// POST /functions/v1/exam-access-request
// Faithful port of legacy requestPublicExamAccess. Issues a hashed OTP for an
// approved applicant and emails it. Service role — never exposes exam content.
// Body: { periodId, applicationCode, email }
// → { success, data: { accessSessionId, maskedEmail, expiresAt } }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok } from "../_shared/cors.ts";
import { getPublicExamWindow } from "../_shared/exam-window.ts";
import { sendEmail, otpEmailHtml } from "../_shared/email.ts";
import {
  createOtpCode,
  createOtpSalt,
  hashOtpCode,
  maskEmailAddress,
  PUBLIC_EXAM_OTP_TTL_MINUTES,
  PUBLIC_EXAM_RESEND_COOLDOWN_SECONDS,
  PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES,
} from "../_shared/otp.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json();
    const periodId = String(body.periodId ?? "");
    const applicationCode = String(body.applicationCode ?? "").trim().toUpperCase();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!periodId || !applicationCode || !email) return fail("Invalid request.");

    const db = serviceClient();
    const now = new Date();

    const { data: application } = await db
      .from("applications")
      .select("id, first_name, last_name, status, application_period_id, email, application_code")
      .eq("application_code", applicationCode)
      .eq("email", email)
      .eq("application_period_id", periodId)
      .maybeSingle();

    if (!application) return fail("Application ID, email, or session is invalid.");
    if (application.status !== "approved") {
      return fail("Your application must be approved before you can take the exam.");
    }

    const { data: period } = await db
      .from("application_periods")
      .select("id, title, exam_start_date, exam_end_date")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return fail("Session not found.");

    const { data: exam } = await db
      .from("exams")
      .select("id, title, status")
      .eq("application_period_id", period.id)
      .eq("status", "active")
      .maybeSingle();
    if (!exam) return fail("No exam is available for this session.");

    const window = getPublicExamWindow(
      { examStartDate: period.exam_start_date, examEndDate: period.exam_end_date },
      now,
    );
    if (window.phase === "too_early" || window.phase === "preview") {
      return fail(
        `Verification opens ${PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES} minutes before the exam begins.`,
      );
    }
    if (window.phase === "closed") return fail("This exam window has closed.");

    // Reuse a pending (unverified) session, respecting the resend cooldown.
    const { data: existing } = await db
      .from("public_exam_access_sessions")
      .select("id, verified_at, session_expires_at, last_sent_at")
      .eq("application_id", application.id)
      .eq("exam_id", exam.id)
      .eq("email", email)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    const pending = (existing ?? []).find(
      (s) => !s.verified_at && !s.session_expires_at,
    ) ?? null;

    if (pending) {
      const cooldownEndsAt =
        new Date(pending.last_sent_at).getTime() + PUBLIC_EXAM_RESEND_COOLDOWN_SECONDS * 1000;
      if (cooldownEndsAt > now.getTime()) {
        const secs = Math.max(1, Math.ceil((cooldownEndsAt - now.getTime()) / 1000));
        return fail(`Please wait ${secs} seconds before requesting another code.`);
      }
    }

    const code = createOtpCode();
    const codeSalt = createOtpSalt();
    const codeHash = hashOtpCode(code, codeSalt);
    const codeExpiresAt = new Date(now.getTime() + PUBLIC_EXAM_OTP_TTL_MINUTES * 60 * 1000);

    let accessSessionId = pending?.id ?? null;
    if (pending) {
      await db
        .from("public_exam_access_sessions")
        .update({
          code_hash: codeHash,
          code_salt: codeSalt,
          code_expires_at: codeExpiresAt.toISOString(),
          code_attempt_count: 0,
          last_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", pending.id);
    } else {
      const { data: created } = await db
        .from("public_exam_access_sessions")
        .insert({
          application_id: application.id,
          application_period_id: period.id,
          exam_id: exam.id,
          email,
          code_hash: codeHash,
          code_salt: codeSalt,
          code_expires_at: codeExpiresAt.toISOString(),
          code_attempt_count: 0,
          last_sent_at: now.toISOString(),
        })
        .select("id")
        .single();
      accessSessionId = created?.id ?? null;
    }

    if (!accessSessionId) return fail("Could not prepare exam verification. Try again.");

    await sendEmail({
      to: email,
      subject: "Your exam verification code",
      html: otpEmailHtml({
        applicantName: `${application.first_name} ${application.last_name}`,
        sessionTitle: period.title,
        examTitle: exam.title,
        code,
        expiresInMinutes: PUBLIC_EXAM_OTP_TTL_MINUTES,
      }),
    });

    return ok({
      accessSessionId,
      maskedEmail: maskEmailAddress(email),
      expiresAt: codeExpiresAt.toISOString(),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error.", 500);
  }
});
