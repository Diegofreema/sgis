import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db, exams, questions } from "@/db";
import { desc, eq } from "drizzle-orm";
import { QuestionBankClient } from "./QuestionBankClient";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  await requireRole(["admin"]);
  const { examId } = await searchParams;

  const allExams = db
    ? await db
        .select({ id: exams.id, title: exams.title, status: exams.status })
        .from(exams)
        .orderBy(desc(exams.createdAt))
    : [];

  const allQuestions =
    db && examId
      ? await db
          .select()
          .from(questions)
          .where(eq(questions.examId, examId))
          .orderBy(questions.sortOrder)
      : db
      ? await db.select().from(questions).orderBy(desc(questions.createdAt))
      : [];

  return (
    <QuestionBankClient
      exams={allExams}
      questions={allQuestions}
      selectedExamId={examId}
    />
  );
}
