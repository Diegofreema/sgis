import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { startExamAttempt } from "@/server/actions/exam.actions";

type Props = {
  searchParams: Promise<{ examId?: string; applicationId?: string }>;
};

export default async function StartExamPage({ searchParams }: Props) {
  const profile = await requireAuth();
  const params = await searchParams;
  const { examId, applicationId } = params;

  if (!examId || !applicationId) {
    redirect("/dashboard/exam");
  }

  const result = await startExamAttempt(examId, applicationId);

  if (!result.success) {
    redirect(`/dashboard/exam?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/dashboard/exam/${result.data.attemptId}`);
}
