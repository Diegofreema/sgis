import { supabase } from "@/lib/supabase/client";
import { type ActionResult } from "@/lib/auth";
import {
  validateQuestionBankInput,
  MAX_BULK_QUESTION_UPLOAD,
  type QuestionOptionDb,
} from "@/lib/question-bank";

/**
 * Question bank — supabase-js via admin RLS. `questions` (incl. correct_option)
 * is admin-only under RLS, so the admin sees answers; students never do.
 */

export type QuestionBankItem = {
  id: string;
  examId: string | null;
  questionText: string;
  questionImageUrl: string | null;
  options: QuestionOptionDb[];
  correctOption: string;
  explanation: string | null;
  marks: string;
  difficulty: "easy" | "medium" | "hard";
  subject: string | null;
  type: "single_choice";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const Q_COLS =
  "id, examId:exam_id, questionText:question_text, questionImageUrl:question_image_url, options, correctOption:correct_option, explanation, marks, difficulty, subject, type, sortOrder:sort_order, createdAt:created_at, updatedAt:updated_at";

export async function getQuestionBankPage(input: {
  page?: number;
  pageSize?: number;
  q?: string;
  subject?: string;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<{ questions: QuestionBankItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.max(1, input.pageSize ?? 20);
  const page = Math.max(1, input.page ?? 1);
  const start = (page - 1) * pageSize;

  let query = supabase
    .from("questions")
    .select(Q_COLS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (input.subject?.trim()) query = query.eq("subject", input.subject.trim());
  if (input.difficulty) query = query.eq("difficulty", input.difficulty);
  if (input.q?.trim()) {
    const t = input.q.trim().replace(/[%,]/g, "");
    query = query.or(
      `question_text.ilike.%${t}%,subject.ilike.%${t}%,explanation.ilike.%${t}%`,
    );
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return {
    questions: (data as unknown as QuestionBankItem[]) ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getQuestionBankSubjects(): Promise<string[]> {
  const { data, error } = await supabase.from("questions").select("subject");
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.subject?.trim()).filter(Boolean) as string[])].sort();
}

type QInput = {
  questionText: string;
  questionImageUrl?: string;
  options: QuestionOptionDb[];
  correctOption: string;
  explanation?: string;
  marks?: number;
  difficulty?: "easy" | "medium" | "hard";
  subject?: string;
  sortOrder?: number;
};

function toRow(d: {
  questionText: string;
  options: QuestionOptionDb[];
  correctOption: string;
  explanation: string | null;
  marks: number | string;
  difficulty: "easy" | "medium" | "hard";
  subject: string;
  sortOrder: number;
}) {
  return {
    exam_id: null,
    question_text: d.questionText,
    options: d.options,
    correct_option: d.correctOption,
    explanation: d.explanation,
    marks: String(d.marks),
    difficulty: d.difficulty,
    subject: d.subject,
    sort_order: d.sortOrder,
  };
}

export async function createQuestionBankItem(
  input: QInput,
): Promise<ActionResult<{ id: string }>> {
  const validated = validateQuestionBankInput(input, {
    requireKnownSubject: true,
    fallbackSortOrder: input.sortOrder ?? 0,
  });
  if (!validated.success) return { success: false, error: validated.error };

  const row = { ...toRow(validated.data), question_image_url: input.questionImageUrl ?? null };
  const { data, error } = await supabase.from("questions").insert(row).select("id").single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function updateQuestionBankItem(
  questionId: string,
  input: Partial<QInput>,
): Promise<ActionResult> {
  const { data: existing } = await supabase
    .from("questions")
    .select("question_text, options, correct_option, explanation, marks, difficulty, subject, sort_order")
    .eq("id", questionId)
    .maybeSingle();
  if (!existing) return { success: false, error: "Question not found." };

  const validated = validateQuestionBankInput(
    {
      questionText: input.questionText ?? existing.question_text,
      options: input.options ?? existing.options,
      correctOption: input.correctOption ?? existing.correct_option,
      explanation: input.explanation ?? existing.explanation,
      marks: input.marks ?? Number(existing.marks),
      difficulty: input.difficulty ?? existing.difficulty,
      subject: input.subject ?? existing.subject,
      sortOrder: input.sortOrder ?? existing.sort_order,
    },
    { fallbackSortOrder: input.sortOrder ?? existing.sort_order },
  );
  if (!validated.success) return { success: false, error: validated.error };

  const patch: Record<string, unknown> = { ...toRow(validated.data), updated_at: new Date().toISOString() };
  if (input.questionImageUrl !== undefined) patch.question_image_url = input.questionImageUrl;
  const { error } = await supabase.from("questions").update(patch).eq("id", questionId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteQuestionBankItem(questionId: string): Promise<ActionResult> {
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function bulkCreateQuestionBankItems(input: {
  questions: QInput[];
}): Promise<ActionResult<{ created: number }>> {
  if (input.questions.length === 0) return { success: false, error: "No questions found in the file." };
  if (input.questions.length > MAX_BULK_QUESTION_UPLOAD) {
    return { success: false, error: `Upload ${MAX_BULK_QUESTION_UPLOAD} questions or fewer at a time.` };
  }
  const rows = [];
  for (let i = 0; i < input.questions.length; i++) {
    const validated = validateQuestionBankInput(input.questions[i], {
      requireKnownSubject: true,
      fallbackSortOrder: i,
    });
    if (!validated.success) return { success: false, error: `Row ${i + 2}: ${validated.error}` };
    rows.push(toRow(validated.data));
  }
  const { error } = await supabase.from("questions").insert(rows);
  if (error) return { success: false, error: error.message };
  return { success: true, data: { created: rows.length } };
}
