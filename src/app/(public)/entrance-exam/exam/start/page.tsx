import { redirect } from "next/navigation";
import { connection } from "next/server";
import { startPublicExamAttempt } from "@/server/actions/exam.actions";

export default async function StartPublicExamPage() {
  await connection();
  const result = await startPublicExamAttempt();
  if (!result.success) {
    redirect(`/entrance-exam?examError=${encodeURIComponent(result.error)}#exam-access`);
  }

  redirect(`/entrance-exam/exam/${result.data.attemptId}`);
}
