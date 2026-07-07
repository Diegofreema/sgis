import { useCallback, useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { NotFound } from "@/components/shared/NotFound";
import { ExamDetailClient } from "@/components/admin/ExamDetailClient";
import {
  getExamForAdmin,
  getExamSessions,
  getQuestionBankAll,
  type AdminExam,
} from "@/lib/admin-exams";
import type { QuestionBankItem } from "@/lib/admin-questions";

const routeApi = getRouteApi("/admin/exams/$id");

type Session = { id: string; title: string; examStartDate: string; examEndDate: string; status: string };

export function AdminExamDetailPage() {
  const { id } = routeApi.useParams();
  const isNew = id === "new";

  const [state, setState] = useState<{
    exam: AdminExam | null;
    questions: QuestionBankItem[];
    sessions: Session[];
    questionBank: QuestionBankItem[];
    notFound: boolean;
  } | null>(null);

  const load = useCallback(() => {
    (async () => {
      const [sessions, questionBank] = await Promise.all([getExamSessions(), getQuestionBankAll()]);
      const available = (sessions as Session[]).filter(
        (s) => new Date(s.examEndDate).getTime() >= Date.now(),
      );

      if (isNew) {
        setState({ exam: null, questions: [], sessions: available, questionBank, notFound: false });
        return;
      }
      const data = await getExamForAdmin(id);
      if (!data) {
        setState({ exam: null, questions: [], sessions: available, questionBank, notFound: true });
        return;
      }
      const current = (sessions as Session[]).find((s) => s.id === data.exam.applicationPeriodId);
      const sessionOptions =
        current && !available.some((s) => s.id === current.id) ? [current, ...available] : available;
      setState({ exam: data.exam, questions: data.questions, sessions: sessionOptions, questionBank, notFound: false });
    })().catch((e) => console.error("[admin exam detail]", e));
  }, [id, isNew]);

  useEffect(() => {
    setState(null);
    load();
  }, [load]);

  if (!state) return <AdminLoading />;
  if (state.notFound) return <NotFound />;

  return (
    <ExamDetailClient
      exam={state.exam}
      questions={state.questions}
      sessions={state.sessions}
      questionBank={state.questionBank}
      onChanged={load}
    />
  );
}
