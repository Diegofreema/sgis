// POST /functions/v1/exam-access-verify
// Faithful port of legacy verifyPublicExamAccess. Checks the OTP (timing-safe),
// enforces attempt limits + expiry, mints the exam session. Returns the session
// token the SPA sends to exam-start / exam-submit (replaces the httpOnly cookie;
// same trust model: random id, server-validated, short-lived, revocable).
// Body: { accessSessionId, code } → { success, data: { token, redirectTo } }
import { serviceClient } from "../_shared/client.ts";
import { fail, handlePreflight, ok, serverError } from "../_shared/cors.ts";
import { getPublicExamWindow } from "../_shared/exam-window.ts";
import {
  getSessionExpiryDate,
  PUBLIC_EXAM_MAX_CODE_ATTEMPTS,
  PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES,
  verifyOtpCode,
} from "../_shared/otp.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json();
    const accessSessionId = String(body.accessSessionId ?? "");
    const code = String(body.code ?? "").trim();
    if (!accessSessionId || !/^\d{6}$/.test(code)) return fail("Invalid code.");

    const db = serviceClient();
    const now = new Date();

    const { data: s } = await db
      .from("public_exam_access_sessions")
      .select(
        "id, application_id, application_period_id, exam_id, code_hash, code_salt, code_expires_at, code_attempt_count, revoked_at",
      )
      .eq("id", accessSessionId)
      .maybeSingle();

    if (!s || s.revoked_at) return fail("Verification session not found. Request a new code.");
    if (new Date(s.code_expires_at) < now) return fail("This code expired. Request a new one.");
    if (s.code_attempt_count >= PUBLIC_EXAM_MAX_CODE_ATTEMPTS) {
      return fail("Too many invalid attempts. Request a new code.");
    }

    const valid = verifyOtpCode({ code, salt: s.code_salt, expectedHash: s.code_hash });
    if (!valid) {
      const nextCount = s.code_attempt_count + 1;
      await db
        .from("public_exam_access_sessions")
        .update({ code_attempt_count: nextCount, updated_at: now.toISOString() })
        .eq("id", s.id);
      if (nextCount >= PUBLIC_EXAM_MAX_CODE_ATTEMPTS) {
        return fail("Too many invalid attempts. Request a new code.");
      }
      return fail("That code is not correct.");
    }

    const [{ data: application }, { data: period }, { data: exam }] = await Promise.all([
      db.from("applications").select("id, status").eq("id", s.application_id).maybeSingle(),
      db
        .from("application_periods")
        .select("id, exam_start_date, exam_end_date")
        .eq("id", s.application_period_id)
        .maybeSingle(),
      db.from("exams").select("id, status").eq("id", s.exam_id).maybeSingle(),
    ]);

    if (
      !application || !period || !exam ||
      application.status !== "approved" || exam.status !== "active"
    ) {
      return fail("This exam is no longer available.");
    }

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

    const sessionExpiresAt = getSessionExpiryDate(period.exam_end_date, now);

    // Revoke any other live sessions for this application+exam.
    await db
      .from("public_exam_access_sessions")
      .update({ revoked_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("application_id", application.id)
      .eq("exam_id", exam.id)
      .neq("id", s.id)
      .is("revoked_at", null);

    await db
      .from("public_exam_access_sessions")
      .update({
        verified_at: now.toISOString(),
        session_expires_at: sessionExpiresAt.toISOString(),
        code_attempt_count: 0,
        updated_at: now.toISOString(),
      })
      .eq("id", s.id);

    return ok({ token: s.id, redirectTo: "/entrance-exam/exam" });
  } catch (error) {
    return serverError("exam-access-verify", error);
  }
});
