"use server";

import { z } from "zod";
import {
  db,
  applications,
  applicationPeriods,
  examAnswers,
  examAttempts,
  exams,
  publicExamAccessSessions,
} from "@/db";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { requireAuth, requireRole } from "@/lib/auth";
import {
  getAssignedQuestionsForExam,
  getAttemptByUser,
  getVerifiedPublicExamAccess,
} from "@/server/queries/exams.queries";
import { EXAM_ATTEMPT_STATUS } from "@/constants/statuses";
import { logActivity } from "@/lib/audit";
import { sendExamResultEmail, sendPublicExamOtpEmail } from "@/lib/email";
import {
  PUBLIC_EXAM_MAX_CODE_ATTEMPTS,
  PUBLIC_EXAM_OTP_TTL_MINUTES,
  PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES,
  PUBLIC_EXAM_RESEND_COOLDOWN_SECONDS,
  clearPublicExamAccessCookie,
  createOtpCode,
  createOtpSalt,
  getPublicExamWindow,
  getSessionExpiryDate,
  hashOtpCode,
  maskEmailAddress,
  setPublicExamAccessCookie,
  verifyOtpCode,
} from "@/lib/public-exam-access";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const submitAnswersSchema = z.array(
  z.object({
    questionId: z.string().uuid(),
    selectedOption: z.string().trim().min(1).nullable(),
  })
);

const requestPublicExamAccessSchema = z.object({
  periodId: z.string().uuid(),
  applicationCode: z.string().trim().min(1),
  email: z.string().trim().email("Enter a valid email address."),
});

const verifyPublicExamAccessSchema = z.object({
  accessSessionId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

async function getAttemptWithOwnership(
  attemptId: string,
  accessMode: "public" | "private" = "private"
) {
  type AttemptOwnership =
    | { error: string }
    | {
        attempt: typeof examAttempts.$inferSelect;
        application: typeof applications.$inferSelect;
        profile: Awaited<ReturnType<typeof requireAuth>> | null;
      };

  if (!db) return { error: "Service unavailable" } as const;

  if (accessMode === "public") {
    const access = await getVerifiedPublicExamAccess();
    if (access.state === "missing") {
      return { error: "Verify your exam access to continue." } as AttemptOwnership;
    }
    if (access.state === "expired") {
      return { error: "Your exam access session expired. Verify again to continue." } as AttemptOwnership;
    }
    if (access.state !== "ready" || !access.application || !access.exam) {
      return { error: "Invalid exam access." } as AttemptOwnership;
    }

    const attempt = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.id, attemptId),
          eq(examAttempts.applicationId, access.application.id),
          eq(examAttempts.examId, access.exam.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!attempt) return { error: "Attempt not found" } as AttemptOwnership;
    return { attempt, application: access.application, profile: null } as AttemptOwnership;
  }

  const profile = await requireAuth();
  const attempt = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!attempt) return { error: "Attempt not found" } as AttemptOwnership;

  if (!profile || attempt.userId !== profile.id) {
    return { error: "Attempt not found" } as AttemptOwnership;
  }

  const app = await db
    .select()
    .from(applications)
    .where(eq(applications.id, attempt.applicationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!app) return { error: "Application not found." } as AttemptOwnership;
  return { attempt, application: app, profile } as AttemptOwnership;
}

function publicExamAccessErrorMessage(state: Awaited<ReturnType<typeof getVerifiedPublicExamAccess>>["state"]) {
  if (state === "missing") return "Verify your exam access before continuing.";
  if (state === "expired") return "Your exam access session expired. Verify again to continue.";
  return "Invalid exam access.";
}

async function createAttempt(input: {
  exam: typeof exams.$inferSelect;
  application: typeof applications.$inferSelect;
  userId: string | null;
}) {
  if (!db) throw new Error("Service unavailable");

  const assignedQuestions = await getAssignedQuestionsForExam(input.exam.id);
  if (assignedQuestions.length === 0) {
    throw new Error("This exam has no assigned questions.");
  }

  const questionOrder = shuffle(assignedQuestions.map((row) => row.question.id));
  const now = new Date();
  const [attempt] = await db
    .insert(examAttempts)
    .values({
      examId: input.exam.id,
      applicationId: input.application.id,
      userId: input.userId,
      startedAt: now,
      expiresAt: new Date(now.getTime() + input.exam.durationMinutes * 60 * 1000),
      questionOrder,
      status: "in_progress",
      totalMarks: input.exam.totalMarks,
    })
    .returning({ id: examAttempts.id });

  return attempt.id;
}

export async function requestPublicExamAccess(input: {
  periodId: string;
  applicationCode: string;
  email: string;
}): Promise<
  ActionResult<{
    accessSessionId: string;
    maskedEmail: string;
    expiresAt: string;
  }>
> {
  if (!db) return { success: false, error: "Service unavailable" };

  const parsed = requestPublicExamAccessSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const applicationCode = parsed.data.applicationCode.trim().toUpperCase();
  const email = parsed.data.email.trim().toLowerCase();
  const now = new Date();

  const application = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.applicationCode, applicationCode),
        eq(applications.email, email),
        eq(applications.applicationPeriodId, parsed.data.periodId)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!application) {
    return { success: false, error: "Application ID, email, or session is invalid." };
  }

  if (application.status !== "approved") {
    return { success: false, error: "Your application must be approved before you can take the exam." };
  }

  const period = await db
    .select()
    .from(applicationPeriods)
    .where(eq(applicationPeriods.id, parsed.data.periodId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!period) {
    return { success: false, error: "Session not found." };
  }

  const exam = await db
    .select()
    .from(exams)
    .where(and(eq(exams.applicationPeriodId, period.id), eq(exams.status, "active")))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!exam) {
    return { success: false, error: "No exam is available for this session." };
  }

  const window = getPublicExamWindow(period);
  if (window.phase === "too_early" || window.phase === "preview") {
    return {
      success: false,
      error: `Verification opens ${PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES} minutes before the exam begins.`,
    };
  }
  if (window.phase === "closed") {
    return { success: false, error: "This exam window has closed." };
  }

  const existingSessions = await db
    .select()
    .from(publicExamAccessSessions)
    .where(
      and(
        eq(publicExamAccessSessions.applicationId, application.id),
        eq(publicExamAccessSessions.examId, exam.id),
        eq(publicExamAccessSessions.email, email),
        isNull(publicExamAccessSessions.revokedAt)
      )
    )
    .orderBy(desc(publicExamAccessSessions.createdAt));

  const pendingSession =
    existingSessions.find((session) => !session.verifiedAt && !session.sessionExpiresAt) ?? null;

  if (pendingSession) {
    const cooldownEndsAt =
      new Date(pendingSession.lastSentAt).getTime() +
      PUBLIC_EXAM_RESEND_COOLDOWN_SECONDS * 1000;
    if (cooldownEndsAt > now.getTime()) {
      const secondsRemaining = Math.max(
        1,
        Math.ceil((cooldownEndsAt - now.getTime()) / 1000)
      );
      return {
        success: false,
        error: `Please wait ${secondsRemaining} seconds before requesting another code.`,
      };
    }
  }

  const code = createOtpCode();
  const codeSalt = createOtpSalt();
  const codeHash = hashOtpCode(code, codeSalt);
  const codeExpiresAt = new Date(now.getTime() + PUBLIC_EXAM_OTP_TTL_MINUTES * 60 * 1000);

  let accessSessionId = pendingSession?.id ?? null;
  if (pendingSession) {
    await db
      .update(publicExamAccessSessions)
      .set({
        codeHash,
        codeSalt,
        codeExpiresAt,
        codeAttemptCount: 0,
        lastSentAt: now,
        updatedAt: now,
      })
      .where(eq(publicExamAccessSessions.id, pendingSession.id));
  } else {
    const [created] = await db
      .insert(publicExamAccessSessions)
      .values({
        applicationId: application.id,
        applicationPeriodId: period.id,
        examId: exam.id,
        email,
        codeHash,
        codeSalt,
        codeExpiresAt,
        codeAttemptCount: 0,
        lastSentAt: now,
      })
      .returning({ id: publicExamAccessSessions.id });

    accessSessionId = created?.id ?? null;
  }

  if (!accessSessionId) {
    return { success: false, error: "Could not prepare exam verification. Try again." };
  }

  try {
    await sendPublicExamOtpEmail({
      to: email,
      applicantName: `${application.firstName} ${application.lastName}`,
      sessionTitle: period.title,
      examTitle: exam.title,
      code,
      expiresInMinutes: PUBLIC_EXAM_OTP_TTL_MINUTES,
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not send the verification code right now.",
    };
  }

  return {
    success: true,
    data: {
      accessSessionId,
      maskedEmail: maskEmailAddress(email),
      expiresAt: codeExpiresAt.toISOString(),
    },
  };
}

export async function verifyPublicExamAccess(input: {
  accessSessionId: string;
  code: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  if (!db) return { success: false, error: "Service unavailable" };

  const parsed = verifyPublicExamAccessSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid code." };
  }

  const accessSession = await db
    .select()
    .from(publicExamAccessSessions)
    .where(eq(publicExamAccessSessions.id, parsed.data.accessSessionId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!accessSession || accessSession.revokedAt) {
    return { success: false, error: "Verification session not found. Request a new code." };
  }

  const now = new Date();
  if (new Date(accessSession.codeExpiresAt) < now) {
    return { success: false, error: "This code expired. Request a new one." };
  }

  if (accessSession.codeAttemptCount >= PUBLIC_EXAM_MAX_CODE_ATTEMPTS) {
    return { success: false, error: "Too many invalid attempts. Request a new code." };
  }

  const codeIsValid = verifyOtpCode({
    code: parsed.data.code,
    salt: accessSession.codeSalt,
    expectedHash: accessSession.codeHash,
  });

  if (!codeIsValid) {
    const nextCount = accessSession.codeAttemptCount + 1;
    await db
      .update(publicExamAccessSessions)
      .set({
        codeAttemptCount: nextCount,
        updatedAt: now,
      })
      .where(eq(publicExamAccessSessions.id, accessSession.id));

    if (nextCount >= PUBLIC_EXAM_MAX_CODE_ATTEMPTS) {
      return { success: false, error: "Too many invalid attempts. Request a new code." };
    }

    return { success: false, error: "That code is not correct." };
  }

  const [application, period, exam] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(eq(applications.id, accessSession.applicationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(applicationPeriods)
      .where(eq(applicationPeriods.id, accessSession.applicationPeriodId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(exams)
      .where(eq(exams.id, accessSession.examId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!application || !period || !exam || application.status !== "approved" || exam.status !== "active") {
    return { success: false, error: "This exam is no longer available." };
  }

  const window = getPublicExamWindow(period);
  if (window.phase === "too_early" || window.phase === "preview") {
    return {
      success: false,
      error: `Verification opens ${PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES} minutes before the exam begins.`,
    };
  }
  if (window.phase === "closed") {
    return { success: false, error: "This exam window has closed." };
  }

  const sessionExpiresAt = getSessionExpiryDate(period.examEndDate, now);

  await db
    .update(publicExamAccessSessions)
    .set({
      revokedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(publicExamAccessSessions.applicationId, application.id),
        eq(publicExamAccessSessions.examId, exam.id),
        ne(publicExamAccessSessions.id, accessSession.id),
        isNull(publicExamAccessSessions.revokedAt)
      )
    );

  await db
    .update(publicExamAccessSessions)
    .set({
      verifiedAt: now,
      sessionExpiresAt,
      codeAttemptCount: 0,
      updatedAt: now,
    })
    .where(eq(publicExamAccessSessions.id, accessSession.id));

  await setPublicExamAccessCookie(accessSession.id, sessionExpiresAt);

  return { success: true, data: { redirectTo: "/entrance-exam/exam" } };
}

export async function clearPublicExamAccess(): Promise<ActionResult> {
  await clearPublicExamAccessCookie();
  return { success: true, data: undefined };
}

export async function startExamAttempt(
  examId: string,
  applicationId: string
): Promise<ActionResult<{ attemptId: string }>> {
  const profile = await requireAuth();
  if (!db) return { success: false, error: "Service unavailable" };

  const application = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, profile.id),
        eq(applications.status, "approved")
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!application) {
    return { success: false, error: "Approved application not found." };
  }

  const exam = await db
    .select()
    .from(exams)
    .where(
      and(
        eq(exams.id, examId),
        eq(exams.applicationPeriodId, application.applicationPeriodId),
        eq(exams.status, "active")
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!exam) return { success: false, error: "Exam is not currently active." };

  const period = await db
    .select()
    .from(applicationPeriods)
    .where(eq(applicationPeriods.id, application.applicationPeriodId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!period) return { success: false, error: "Application session not found." };
  const window = getPublicExamWindow(period);
  if (window.phase === "closed") {
    return { success: false, error: "Exam window has closed." };
  }
  if (window.phase !== "live") {
    return { success: false, error: "Exam has not started yet." };
  }

  const existing = await getAttemptByUser(profile.id, examId);
  if (existing) {
    if (
      existing.status === EXAM_ATTEMPT_STATUS.SUBMITTED ||
      existing.status === EXAM_ATTEMPT_STATUS.GRADED ||
      existing.status === EXAM_ATTEMPT_STATUS.EXPIRED
    ) {
      return { success: false, error: "You have already completed this exam." };
    }
    return { success: true, data: { attemptId: existing.id } };
  }

  try {
    const attemptId = await createAttempt({
      exam,
      application,
      userId: profile.id,
    });

    await logActivity({
      actorId: profile.id,
      actorRole: profile.role,
      action: "exam.started",
      entityType: "exam_attempt",
      entityId: attemptId,
      metadata: { examId: exam.id, applicationId: application.id },
    });

    return { success: true, data: { attemptId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start exam.";
    return { success: false, error: message };
  }
}

export async function startPublicExamAttempt(): Promise<ActionResult<{ attemptId: string }>> {
  if (!db) return { success: false, error: "Service unavailable" };

  const access = await getVerifiedPublicExamAccess();
  if (access.state !== "ready") {
    return { success: false, error: publicExamAccessErrorMessage(access.state) };
  }
  if (!access.application || !access.exam || !access.period) {
    return { success: false, error: "Exam is not available." };
  }

  const window = getPublicExamWindow(access.period);
  if (window.phase === "closed") {
    return { success: false, error: "Exam window has closed." };
  }
  if (window.phase !== "live") {
    return { success: false, error: "Exam has not started yet." };
  }

  if (access.attempt) {
    if (
      access.attempt.status === EXAM_ATTEMPT_STATUS.SUBMITTED ||
      access.attempt.status === EXAM_ATTEMPT_STATUS.GRADED ||
      access.attempt.status === EXAM_ATTEMPT_STATUS.EXPIRED
    ) {
      return { success: false, error: "This exam has already been completed." };
    }

    return { success: true, data: { attemptId: access.attempt.id } };
  }

  try {
    const attemptId = await createAttempt({
      exam: access.exam,
      application: access.application,
      userId: null,
    });

    await logActivity({
      action: "exam.public_started",
      entityType: "exam_attempt",
      entityId: attemptId,
      metadata: {
        examId: access.exam.id,
        applicationCode: access.application.applicationCode,
      },
    });

    return { success: true, data: { attemptId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start exam.";
    return { success: false, error: message };
  }
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: string,
  accessMode: "public" | "private" = "private"
): Promise<ActionResult> {
  if (!db) return { success: false, error: "Service unavailable" };

  const owned = await getAttemptWithOwnership(attemptId, accessMode);
  if ("error" in owned) return { success: false, error: owned.error };

  if (owned.attempt.status !== "in_progress") {
    return { success: false, error: "Invalid or expired attempt" };
  }
  if (new Date() > owned.attempt.expiresAt) {
    await db
      .update(examAttempts)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(examAttempts.id, attemptId));
    return { success: false, error: "Exam time has expired" };
  }
  if (!owned.attempt.questionOrder.includes(questionId)) {
    return { success: false, error: "Question does not belong to this attempt." };
  }

  const existing = await db
    .select({ id: examAnswers.id })
    .from(examAnswers)
    .where(and(eq(examAnswers.attemptId, attemptId), eq(examAnswers.questionId, questionId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existing) {
    await db
      .update(examAnswers)
      .set({ selectedOption: selectedOption.trim().toLowerCase(), updatedAt: new Date() })
      .where(eq(examAnswers.id, existing.id));
  } else {
    await db.insert(examAnswers).values({
      attemptId,
      questionId,
      selectedOption: selectedOption.trim().toLowerCase(),
    });
  }

  return { success: true, data: undefined };
}

export async function submitExam(
  attemptId: string,
  accessMode: "public" | "private" = "private",
  answersPayload?: z.infer<typeof submitAnswersSchema>
): Promise<ActionResult> {
  if (!db) return { success: false, error: "Service unavailable" };

  const owned = await getAttemptWithOwnership(attemptId, accessMode);
  if ("error" in owned) return { success: false, error: owned.error };

  const { attempt, application, profile } = owned;
  if (
    attempt.status === EXAM_ATTEMPT_STATUS.SUBMITTED ||
    attempt.status === EXAM_ATTEMPT_STATUS.GRADED
  ) {
    return { success: true, data: undefined };
  }

  const parsedPayload = answersPayload ? submitAnswersSchema.safeParse(answersPayload) : null;
  if (parsedPayload && !parsedPayload.success) {
    return { success: false, error: "Invalid answer payload." };
  }

  const assignedQuestions = await getAssignedQuestionsForExam(attempt.examId);
  if (assignedQuestions.length === 0) {
    return { success: false, error: "This exam has no assigned questions." };
  }

  const questionMap = new Map(
    assignedQuestions.map(({ question }) => [question.id, question] as const)
  );
  const allowedQuestionIds = new Set(attempt.questionOrder);

  if (parsedPayload?.success) {
    for (const answer of parsedPayload.data) {
      if (!allowedQuestionIds.has(answer.questionId)) continue;

      const existing = await db
        .select({ id: examAnswers.id })
        .from(examAnswers)
        .where(
          and(
            eq(examAnswers.attemptId, attemptId),
            eq(examAnswers.questionId, answer.questionId)
          )
        )
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (existing) {
        await db
          .update(examAnswers)
          .set({
            selectedOption: answer.selectedOption?.trim().toLowerCase() ?? null,
            updatedAt: new Date(),
          })
          .where(eq(examAnswers.id, existing.id));
      } else {
        await db.insert(examAnswers).values({
          attemptId,
          questionId: answer.questionId,
          selectedOption: answer.selectedOption?.trim().toLowerCase() ?? null,
        });
      }
    }
  }

  const answerRows = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.attemptId, attemptId));

  const answerMap = new Map(answerRows.map((row) => [row.questionId, row]));
  let totalScore = 0;

  for (const questionId of attempt.questionOrder) {
    const question = questionMap.get(questionId);
    if (!question) continue;

    const existingAnswer = answerMap.get(questionId);
    const selectedOption = existingAnswer?.selectedOption ?? null;
    const isCorrect = selectedOption === question.correctOption;
    const marksAwarded = isCorrect ? Number(question.marks) : 0;
    totalScore += marksAwarded;

    if (existingAnswer) {
      await db
        .update(examAnswers)
        .set({
          isCorrect,
          marksAwarded: String(marksAwarded),
          updatedAt: new Date(),
        })
        .where(eq(examAnswers.id, existingAnswer.id));
    } else {
      await db.insert(examAnswers).values({
        attemptId,
        questionId,
        selectedOption: null,
        isCorrect: false,
        marksAwarded: "0",
      });
    }
  }

  const totalMarks = attempt.totalMarks ?? assignedQuestions.reduce((sum, row) => sum + Number(row.question.marks), 0);
  const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
  const exam = await db
    .select()
    .from(exams)
    .where(eq(exams.id, attempt.examId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!exam) return { success: false, error: "Exam not found." };

  await db
    .update(examAttempts)
    .set({
      status: "graded",
      score: String(totalScore),
      passed: percentage >= exam.passingScore,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(examAttempts.id, attemptId));

  await logActivity({
    actorId: profile?.id,
    actorRole: profile?.role,
    action: "exam.submitted",
    entityType: "exam_attempt",
    entityId: attemptId,
    metadata: {
      score: totalScore,
      percentage,
      passed: percentage >= exam.passingScore,
      applicationCode: application.applicationCode,
    },
  });

  return { success: true, data: undefined };
}

export async function sendResultEmail(attemptId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const rows = await db
    .select({ attempt: examAttempts, exam: exams, application: applications })
    .from(examAttempts)
    .innerJoin(exams, eq(examAttempts.examId, exams.id))
    .innerJoin(applications, eq(examAttempts.applicationId, applications.id))
    .where(eq(examAttempts.id, attemptId))
    .limit(1);

  const row = rows[0];
  if (!row || row.attempt.score === null) {
    return { success: false, error: "Result not found." };
  }

  await sendExamResultEmail({
    to: row.application.email,
    applicantName: `${row.application.firstName} ${row.application.lastName}`,
    applicationCode: row.application.applicationCode,
    examTitle: row.exam.title,
    score: Number(row.attempt.score),
    totalMarks: row.attempt.totalMarks ?? row.exam.totalMarks,
    passingScore: row.exam.passingScore,
  });

  return { success: true, data: undefined };
}

export async function sendBulkResultEmails(examId: string): Promise<ActionResult<{ sent: number }>> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const rows = await db
    .select({ attempt: examAttempts, exam: exams, application: applications })
    .from(examAttempts)
    .innerJoin(exams, eq(examAttempts.examId, exams.id))
    .innerJoin(applications, eq(examAttempts.applicationId, applications.id))
    .where(and(eq(examAttempts.examId, examId), eq(examAttempts.status, "graded")));

  let sent = 0;
  for (const row of rows) {
    if (row.attempt.score === null) continue;
    await sendExamResultEmail({
      to: row.application.email,
      applicantName: `${row.application.firstName} ${row.application.lastName}`,
      applicationCode: row.application.applicationCode,
      examTitle: row.exam.title,
      score: Number(row.attempt.score),
      totalMarks: row.attempt.totalMarks ?? row.exam.totalMarks,
      passingScore: row.exam.passingScore,
    });
    sent += 1;
  }

  return { success: true, data: { sent } };
}

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
      showResultImmediately: false,
      updatedAt: new Date(),
    })
    .where(eq(exams.id, examId));

  return { success: true, data: undefined };
}

export async function resetExamAttempt(attemptId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db.delete(examAnswers).where(eq(examAnswers.attemptId, attemptId));
  await db.delete(examAttempts).where(eq(examAttempts.id, attemptId));

  return { success: true, data: undefined };
}
