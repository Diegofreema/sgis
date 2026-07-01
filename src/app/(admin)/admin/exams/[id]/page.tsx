import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db, applicationPeriods, questions } from "@/db";
import { desc } from "drizzle-orm";
import { getExamForAdmin } from "@/server/queries/exams.queries";
import { ExamDetailClient } from "./ExamDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminExamDetailPage({ params }: Props) {
  const { id } = await params;
  await requireRole(["admin"]);

  const [sessions, questionBank] = await Promise.all([
    db ? db.select().from(applicationPeriods).orderBy(desc(applicationPeriods.createdAt)) : [],
    db ? db.select().from(questions).orderBy(desc(questions.createdAt)) : [],
  ]);
  const availableSessions = sessions.filter(
    (session) => new Date(session.examEndDate).getTime() >= Date.now()
  );

  if (id === "new") {
    return <ExamDetailClient exam={null} questions={[]} sessions={availableSessions} questionBank={questionBank} />;
  }

  const data = await getExamForAdmin(id);
  if (!data) notFound();

  const currentSession = sessions.find((session) => session.id === data.exam.applicationPeriodId);
  const sessionOptions =
    currentSession && !availableSessions.some((session) => session.id === currentSession.id)
      ? [currentSession, ...availableSessions]
      : availableSessions;

  return (
    <ExamDetailClient
      exam={data.exam}
      questions={data.questions}
      sessions={sessionOptions}
      questionBank={questionBank}
    />
  );
}
