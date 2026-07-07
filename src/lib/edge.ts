import { supabase } from "@/lib/supabase/client";

/**
 * Typed clients for the Supabase Edge Functions that back the server-only
 * entrance-exam + application flows (answer secrecy, OTP, grading, file
 * validation). See supabase/functions/* and RLS-EDGE-PLAN.md.
 *
 * These replace the legacy server actions:
 *   requestPublicExamAccess → examAccessRequest
 *   verifyPublicExamAccess  → examAccessVerify
 *   startPublicExamAttempt  → examStart
 *   submitExam              → examSubmit
 *   createPublicApplication → submitApplication
 */

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

async function invoke<T>(
  name: string,
  body: Record<string, unknown> | FormData,
): Promise<ActionResult<T>> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Edge function returned a non-2xx: surface its {error} if present.
    const message =
      (data as { error?: string } | null)?.error ?? error.message ?? "Request failed.";
    return { success: false, error: message };
  }
  return data as ActionResult<T>;
}

export function examAccessRequest(input: {
  periodId: string;
  applicationCode: string;
  email: string;
}) {
  return invoke<{ accessSessionId: string; maskedEmail: string; expiresAt: string }>(
    "exam-access-request",
    input,
  );
}

export function examAccessVerify(input: { accessSessionId: string; code: string }) {
  return invoke<{ token: string; redirectTo: string }>("exam-access-verify", input);
}

export type ExamStartData = {
  attemptId: string;
  expiresAt: string;
  exam: Record<string, unknown>;
  questions: Array<{
    id: string;
    questionText: string;
    questionImageUrl: string | null;
    options: { id: string; text: string }[];
    marks: number;
    subject: string | null;
    type: string;
  }>;
};

export function examStart(token: string) {
  return invoke<ExamStartData>("exam-start", { token });
}

export function examSubmit(input: {
  token: string;
  attemptId: string;
  answers: Array<{ questionId: string; selectedOption: string | null }>;
}) {
  return invoke<undefined>("exam-submit", input);
}

/** Multipart application submission (fields + receipt/doc files). */
export function submitApplication(formData: FormData) {
  return invoke<{ applicationCode: string }>("submit-application", formData);
}
