import { requireRole } from "@/lib/auth";
import { getQuestionBankPage, getQuestionBankSubjects } from "@/server/queries/exams.queries";
import { QuestionBankClient } from "./QuestionBankClient";

type Props = {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    difficulty?: "easy" | "medium" | "hard";
    page?: string;
  }>;
};

export default async function QuestionBankPage({ searchParams }: Props) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const difficulty =
    params.difficulty === "easy" || params.difficulty === "medium" || params.difficulty === "hard"
      ? params.difficulty
      : undefined;

  const [{ questions, total, pageSize }, subjects] = await Promise.all([
    getQuestionBankPage({
      q: params.q,
      subject: params.subject,
      difficulty,
      page: Number.isFinite(page) ? page : 1,
      pageSize: 20,
    }),
    getQuestionBankSubjects(),
  ]);

  return (
    <QuestionBankClient
      questions={questions}
      total={total}
      page={Number.isFinite(page) && page > 0 ? page : 1}
      pageSize={pageSize}
      filters={{
        q: params.q ?? "",
        subject: params.subject ?? "",
        difficulty: difficulty ?? "",
      }}
      subjects={subjects}
    />
  );
}
