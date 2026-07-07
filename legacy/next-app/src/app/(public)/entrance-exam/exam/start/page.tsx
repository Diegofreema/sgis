import { redirect } from "next/navigation";
import { connection } from "next/server";
import { EXAM_ATTEMPT_STATUS } from "@/constants/statuses";
import { startPublicExamAttempt } from "@/server/actions/exam.actions";
import { getVerifiedPublicExamAccess } from "@/server/queries/exams.queries";

export default async function StartPublicExamPage() {
  await connection();
  const result = await startPublicExamAttempt();
  if (!result.success) {
    const access = await getVerifiedPublicExamAccess();

    if (access.state === "ready" && access.application && access.attempt) {
      if (access.attempt.status === EXAM_ATTEMPT_STATUS.GRADED) {
        redirect(`/entrance-exam/exam/${access.attempt.id}/result`);
      }

      if (
        access.attempt.status === EXAM_ATTEMPT_STATUS.SUBMITTED ||
        access.attempt.status === EXAM_ATTEMPT_STATUS.EXPIRED
      ) {
        redirect(
          `/entrance-exam?applicationId=${encodeURIComponent(
            access.application.applicationCode
          )}#status`
        );
      }
    }

    const params = new URLSearchParams({
      error: result.error,
    });

    if (access.state === "ready" && access.period) {
      params.set("session", access.period.id);
    }

    redirect(`/entrance-exam/exam?${params.toString()}`);
  }

  redirect(`/entrance-exam/exam/${result.data.attemptId}`);
}
