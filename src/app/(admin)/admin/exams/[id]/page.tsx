import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getExamForAdmin } from "@/server/queries/exams.queries";
import { ExamDetailClient } from "./ExamDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminExamDetailPage({ params }: Props) {
  const { id } = await params;
  await requireRole(["admin"]);

  if (id === "new") {
    return <ExamDetailClient exam={null} questions={[]} />;
  }

  const data = await getExamForAdmin(id);
  if (!data) notFound();

  return <ExamDetailClient exam={data.exam} questions={data.questions} />;
}
