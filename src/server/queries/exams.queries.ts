/**
 * Exam queries with strict security:
 * - getExamForStudent NEVER returns correct_option
 * - getExamForAdmin includes full data
 */
import { db, exams, questions, examAttempts, examAnswers } from "@/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Student-safe exam query.
 * Strips correct_option and explanation from every question.
 */
export async function getExamForStudent(examId: string) {
  if (!db) return null;

  const examResult = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  const exam = examResult[0];
  if (!exam) return null;

  const questionRows = await db
    .select({
      id: questions.id,
      examId: questions.examId,
      questionText: questions.questionText,
      questionImageUrl: questions.questionImageUrl,
      options: questions.options,
      // correctOption intentionally omitted — never sent to students
      marks: questions.marks,
      difficulty: questions.difficulty,
      subject: questions.subject,
      type: questions.type,
      sortOrder: questions.sortOrder,
      createdAt: questions.createdAt,
      updatedAt: questions.updatedAt,
    })
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(questions.sortOrder);

  // Drizzle returns `numeric` columns as strings; normalise marks to number
  const typedQuestions = questionRows.map((q) => ({
    ...q,
    marks: Number(q.marks),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  }));

  return { exam, questions: typedQuestions };
}

/**
 * Admin-only exam query — includes correct answers.
 */
export async function getExamForAdmin(examId: string) {
  if (!db) return null;

  const examResult = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  const exam = examResult[0];
  if (!exam) return null;

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(questions.sortOrder);

  return { exam, questions: questionRows };
}

export async function getAttemptByUser(userId: string, examId: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(examAttempts)
    .where(and(eq(examAttempts.userId, userId), eq(examAttempts.examId, examId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getAttemptById(attemptId: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  return result[0] ?? null;
}

export async function getAnswersByAttempt(attemptId: string) {
  if (!db) return [];
  return db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.attemptId, attemptId));
}

export async function listAttempts(filters?: { examId?: string; userId?: string }) {
  if (!db) return [];
  const conditions = [];
  if (filters?.examId) conditions.push(eq(examAttempts.examId, filters.examId));
  if (filters?.userId) conditions.push(eq(examAttempts.userId, filters.userId));

  return conditions.length > 0
    ? db
        .select()
        .from(examAttempts)
        .where(and(...conditions))
        .orderBy(desc(examAttempts.createdAt))
    : db.select().from(examAttempts).orderBy(desc(examAttempts.createdAt));
}
