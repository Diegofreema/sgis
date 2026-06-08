"use server";

import { z } from "zod";
import { db, exams, examAttempts, examAnswers, questions, applications } from "@/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAttemptByUser } from "@/server/queries/exams.queries";
import { EXAM_ATTEMPT_STATUS } from "@/constants/statuses";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Start an exam attempt.
 * Guards: approved application, exam is active, within exam window, no prior attempt.
 */
export async function startExamAttempt(
  examId: string,
  applicationId: string
): Promise<ActionResult<{ attemptId: string }>> {
  const profile = await requireAuth();
  if (!db) return { success: false, error: "Service unavailable" };

  // Verify application belongs to user and is approved
  const app = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, profile.id),
        eq(applications.status, "approved")
      )
    )
    .limit(1);

  if (!app[0]) {
    return { success: false, error: "Approved application not found" };
  }

  // Verify exam is active
  const exam = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  if (!exam[0]) return { success: false, error: "Exam not found" };
  if (exam[0].status !== "active") {
    return { success: false, error: "Exam is not currently active" };
  }

  // Check no existing attempt
  const existing = await getAttemptByUser(profile.id, examId);
  if (existing) {
    if (
      existing.status === EXAM_ATTEMPT_STATUS.SUBMITTED ||
      existing.status === EXAM_ATTEMPT_STATUS.EXPIRED
    ) {
      return { success: false, error: "You have already completed this exam" };
    }
    // In progress — return existing
    return { success: true, data: { attemptId: existing.id } };
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + exam[0].durationMinutes * 60 * 1000
  );

  const [attempt] = await db
    .insert(examAttempts)
    .values({
      examId,
      applicationId,
      userId: profile.id,
      startedAt: now,
      expiresAt,
      status: "in_progress",
      totalMarks: exam[0].totalMarks,
    })
    .returning({ id: examAttempts.id });

  return { success: true, data: { attemptId: attempt.id } };
}

/**
 * Save a single answer server-side.
 * Called on every answer selection during the exam.
 */
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: string
): Promise<ActionResult> {
  const profile = await requireAuth();
  if (!db) return { success: false, error: "Service unavailable" };

  // Verify attempt belongs to user and is in_progress
  const attempt = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.userId, profile.id),
        eq(examAttempts.status, "in_progress")
      )
    )
    .limit(1);

  if (!attempt[0]) {
    return { success: false, error: "Invalid or expired attempt" };
  }

  // Check attempt hasn't expired
  if (new Date() > attempt[0].expiresAt) {
    await db
      .update(examAttempts)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(examAttempts.id, attemptId));
    return { success: false, error: "Exam time has expired" };
  }

  // Upsert the answer
  const existing = await db
    .select({ id: examAnswers.id })
    .from(examAnswers)
    .where(
      and(
        eq(examAnswers.attemptId, attemptId),
        eq(examAnswers.questionId, questionId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(examAnswers)
      .set({ selectedOption, updatedAt: new Date() })
      .where(eq(examAnswers.id, existing[0].id));
  } else {
    await db.insert(examAnswers).values({
      attemptId,
      questionId,
      selectedOption,
    });
  }

  return { success: true, data: undefined };
}

/**
 * Submit the exam and run server-side grading.
 */
export async function submitExam(attemptId: string): Promise<ActionResult> {
  const profile = await requireAuth();
  if (!db) return { success: false, error: "Service unavailable" };

  const attemptRows = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.userId, profile.id)
      )
    )
    .limit(1);

  const attempt = attemptRows[0];
  if (!attempt) return { success: false, error: "Attempt not found" };

  if (
    attempt.status === EXAM_ATTEMPT_STATUS.SUBMITTED ||
    attempt.status === EXAM_ATTEMPT_STATUS.EXPIRED
  ) {
    return { success: false, error: "Exam already submitted" };
  }

  // Grade: fetch all questions with correct answers (server-side only)
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, attempt.examId));

  const answerRows = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.attemptId, attemptId));

  const answerMap = new Map(answerRows.map((a) => [a.questionId, a.selectedOption]));

  let totalScore = 0;

  for (const q of questionRows) {
    const selected = answerMap.get(q.id);
    const isCorrect = selected === q.correctOption;
    const marksAwarded = isCorrect ? Number(q.marks) : 0;
    totalScore += marksAwarded;

    // Update or insert answer with grading
    const existingAnswer = answerRows.find((a) => a.questionId === q.id);
    if (existingAnswer) {
      await db
        .update(examAnswers)
        .set({ isCorrect, marksAwarded: String(marksAwarded), updatedAt: new Date() })
        .where(eq(examAnswers.id, existingAnswer.id));
    } else {
      await db.insert(examAnswers).values({
        attemptId,
        questionId: q.id,
        selectedOption: null,
        isCorrect: false,
        marksAwarded: "0",
      });
    }
  }

  // Mark attempt as submitted+graded
  await db
    .update(examAttempts)
    .set({
      status: "graded",
      score: String(totalScore),
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(examAttempts.id, attemptId));

  return { success: true, data: undefined };
}

/** Admin: release results for an exam */
export async function releaseResults(
  examId: string,
  releaseDate?: Date
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(exams)
    .set({
      resultReleaseDate: releaseDate ?? new Date(),
      showResultImmediately: !releaseDate,
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId));

  return { success: true, data: undefined };
}

/** Admin: reset a student's exam attempt */
export async function resetExamAttempt(attemptId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .delete(examAnswers)
    .where(eq(examAnswers.attemptId, attemptId));

  await db
    .delete(examAttempts)
    .where(eq(examAttempts.id, attemptId));

  return { success: true, data: undefined };
}
