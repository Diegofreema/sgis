import { redirect } from "next/navigation";
import { connection } from "next/server";
import { startPublicExamAttempt } from "@/server/actions/exam.actions";
import { getVerifiedPublicExamAccess } from "@/server/queries/exams.queries";

export default async function StartPublicExamPage() {
  await connection();
  const result = await startPublicExamAttempt();
  if (!result.success) {
    const access = await getVerifiedPublicExamAccess();
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
