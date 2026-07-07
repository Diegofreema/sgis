import { useCallback, useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { QuestionBankClient } from "@/components/admin/QuestionBankClient";
import {
  getQuestionBankPage,
  getQuestionBankSubjects,
  type QuestionBankItem,
} from "@/lib/admin-questions";

const routeApi = getRouteApi("/admin/question-bank");

export function AdminQuestionBankPage() {
  const search = routeApi.useSearch();
  const difficulty =
    search.difficulty === "easy" || search.difficulty === "medium" || search.difficulty === "hard"
      ? search.difficulty
      : undefined;
  const page = Math.max(1, Number(search.page ?? 1) || 1);

  const [data, setData] = useState<{
    questions: QuestionBankItem[];
    total: number;
    pageSize: number;
    subjects: string[];
  } | null>(null);

  const load = useCallback(() => {
    Promise.all([
      getQuestionBankPage({ q: search.q, subject: search.subject, difficulty, page, pageSize: 20 }),
      getQuestionBankSubjects(),
    ])
      .then(([res, subjects]) =>
        setData({ questions: res.questions, total: res.total, pageSize: res.pageSize, subjects }),
      )
      .catch((e) => console.error("[question bank]", e));
  }, [search.q, search.subject, difficulty, page]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  if (!data) return <AdminLoading />;

  return (
    <QuestionBankClient
      questions={data.questions}
      total={data.total}
      page={page}
      pageSize={data.pageSize}
      filters={{ q: search.q ?? "", subject: search.subject ?? "", difficulty: difficulty ?? "" }}
      subjects={data.subjects}
      onReload={load}
    />
  );
}
