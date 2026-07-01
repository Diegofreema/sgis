import {
  db,
  applications,
  applicationPeriods,
  examAnswers,
  examAttempts,
  examQuestions,
  exams,
  publicExamAccessSessions,
  questions,
} from "@/db";
import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import type {
  Application,
  ApplicationPeriod,
  ExamAttempt,
  PublicExamAccessSession,
  Question,
} from "@/db";
import {
  getPublicExamAccessCookieValue,
  getPublicExamWindow,
} from "@/lib/public-exam-access";

export type PublicExamAccessState =
  | "not_found"
  | "not_approved"
  | "no_exam_for_session"
  | "exam_not_started"
  | "exam_closed"
  | "ready"
  | "in_progress"
  | "submitted";

export type PublicExamAccess = {
  state: PublicExamAccessState;
  application: Application | null;
  period: ApplicationPeriod | null;
  exam: typeof exams.$inferSelect | null;
  attempt: ExamAttempt | null;
};

export type PublicExamDiscoveryState =
  | "not_found"
  | "no_exam_for_session"
  | "preview_locked"
  | "preview_open"
  | "verification_open"
  | "live"
  | "exam_closed";

export type PublicExamDiscovery = {
  state: PublicExamDiscoveryState;
  period: ApplicationPeriod | null;
  exam: typeof exams.$inferSelect | null;
  previewOpensAt: Date | null;
  verificationOpensAt: Date | null;
};

export type VerifiedPublicExamAccessState = "missing" | "invalid" | "expired" | "ready";

export type VerifiedPublicExamAccess = {
  state: VerifiedPublicExamAccessState;
  accessSession: PublicExamAccessSession | null;
  application: Application | null;
  period: ApplicationPeriod | null;
  exam: typeof exams.$inferSelect | null;
  attempt: ExamAttempt | null;
};

function mapAttemptState(attempt: ExamAttempt | null): PublicExamAccessState | null {
  if (!attempt) return null;
  if (attempt.status === "in_progress") return "in_progress";
  if (
    attempt.status === "submitted" ||
    attempt.status === "graded" ||
    attempt.status === "expired"
  ) {
    return "submitted";
  }
  return null;
}

function sortQuestions<T extends { id: string }>(items: T[], questionOrder?: string[]) {
  if (!questionOrder?.length) return items;
  const rank = new Map(questionOrder.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });
}

export async function getAssignedQuestionsForExam(examId: string) {
  if (!db) return [];

  const assignments = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(examQuestions.sortOrder);

  if (assignments.length > 0) {
    const questionRows = await db
      .select()
      .from(questions)
      .where(inArray(questions.id, assignments.map((assignment) => assignment.questionId)));
    const questionMap = new Map(questionRows.map((question) => [question.id, question]));

    return assignments
      .map((assignment) => ({
        assignment,
        question: questionMap.get(assignment.questionId),
      }))
      .filter((row): row is { assignment: typeof assignments[number]; question: Question } => Boolean(row.question));
  }

  // ponytail: legacy fallback while older data still exists in some environments.
  const legacyQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(questions.sortOrder);

  return legacyQuestions.map((question) => ({
    assignment: {
      examId,
      questionId: question.id,
      sortOrder: question.sortOrder,
      createdAt: question.createdAt,
    },
    question,
  }));
}

export async function getExamForStudent(examId: string, questionOrder?: string[]) {
  if (!db) return null;

  const exam = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!exam) return null;

  const assigned = await getAssignedQuestionsForExam(examId);
  const typedQuestions = sortQuestions(
    assigned.map(({ question }) => ({
      id: question.id,
      examId,
      questionText: question.questionText,
      questionImageUrl: question.questionImageUrl,
      options: question.options,
      marks: Number(question.marks),
      difficulty: question.difficulty,
      subject: question.subject,
      type: question.type,
      sortOrder: question.sortOrder,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    })),
    questionOrder
  );

  return { exam, questions: typedQuestions };
}

export async function getExamForAdmin(examId: string) {
  if (!db) return null;

  const exam = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!exam) return null;

  const assigned = await getAssignedQuestionsForExam(examId);

  return {
    exam,
    questions: assigned.map(({ question, assignment }) => ({
      ...question,
      sortOrder: assignment.sortOrder,
    })),
  };
}

export async function getQuestionBankItem(questionId: string) {
  if (!db) return null;
  return db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function getAttemptByUser(userId: string, examId: string) {
  if (!db) return null;
  return db
    .select()
    .from(examAttempts)
    .where(and(eq(examAttempts.userId, userId), eq(examAttempts.examId, examId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function getAttemptById(attemptId: string) {
  if (!db) return null;
  return db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
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

  return conditions.length
    ? db
        .select()
        .from(examAttempts)
        .where(and(...conditions))
        .orderBy(desc(examAttempts.createdAt))
    : db.select().from(examAttempts).orderBy(desc(examAttempts.createdAt));
}

export async function getActiveExamForPeriod(periodId: string) {
  if (!db) return null;

  return db
    .select()
    .from(exams)
    .where(and(eq(exams.applicationPeriodId, periodId), eq(exams.status, "active")))
    .orderBy(desc(exams.updatedAt))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function getPublicExamDiscovery(periodId: string): Promise<PublicExamDiscovery> {
  if (!db) {
    return {
      state: "not_found",
      period: null,
      exam: null,
      previewOpensAt: null,
      verificationOpensAt: null,
    };
  }

  const period = await db
    .select()
    .from(applicationPeriods)
    .where(eq(applicationPeriods.id, periodId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!period) {
    return {
      state: "not_found",
      period: null,
      exam: null,
      previewOpensAt: null,
      verificationOpensAt: null,
    };
  }

  const exam = await getActiveExamForPeriod(period.id);
  if (!exam) {
    return {
      state: "no_exam_for_session",
      period,
      exam: null,
      previewOpensAt: null,
      verificationOpensAt: null,
    };
  }

  const window = getPublicExamWindow(period);
  if (window.phase === "too_early") {
    return {
      state: "preview_locked",
      period,
      exam,
      previewOpensAt: window.previewOpensAt,
      verificationOpensAt: window.verificationOpensAt,
    };
  }
  if (window.phase === "preview") {
    return {
      state: "preview_open",
      period,
      exam,
      previewOpensAt: window.previewOpensAt,
      verificationOpensAt: window.verificationOpensAt,
    };
  }
  if (window.phase === "verification") {
    return {
      state: "verification_open",
      period,
      exam,
      previewOpensAt: window.previewOpensAt,
      verificationOpensAt: window.verificationOpensAt,
    };
  }
  if (window.phase === "live") {
    return {
      state: "live",
      period,
      exam,
      previewOpensAt: window.previewOpensAt,
      verificationOpensAt: window.verificationOpensAt,
    };
  }

  return {
    state: "exam_closed",
    period,
    exam,
    previewOpensAt: window.previewOpensAt,
    verificationOpensAt: window.verificationOpensAt,
  };
}

export async function getVerifiedPublicExamAccess(): Promise<VerifiedPublicExamAccess> {
  if (!db) {
    return {
      state: "missing",
      accessSession: null,
      application: null,
      period: null,
      exam: null,
      attempt: null,
    };
  }

  const cookieValue = await getPublicExamAccessCookieValue();
  if (!cookieValue) {
    return {
      state: "missing",
      accessSession: null,
      application: null,
      period: null,
      exam: null,
      attempt: null,
    };
  }

  const accessSession = await db
    .select()
    .from(publicExamAccessSessions)
    .where(eq(publicExamAccessSessions.id, cookieValue))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (
    !accessSession ||
    accessSession.revokedAt ||
    !accessSession.verifiedAt ||
    !accessSession.sessionExpiresAt
  ) {
    return {
      state: "invalid",
      accessSession,
      application: null,
      period: null,
      exam: null,
      attempt: null,
    };
  }

  if (new Date() > new Date(accessSession.sessionExpiresAt)) {
    return {
      state: "expired",
      accessSession,
      application: null,
      period: null,
      exam: null,
      attempt: null,
    };
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

  if (
    !application ||
    !period ||
    !exam ||
    application.status !== "approved" ||
    exam.status !== "active"
  ) {
    return {
      state: "invalid",
      accessSession,
      application,
      period,
      exam,
      attempt: null,
    };
  }

  const attempt = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.applicationId, application.id),
        eq(examAttempts.examId, exam.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return {
    state: "ready",
    accessSession,
    application,
    period,
    exam,
    attempt,
  };
}

export async function getPublicExamAccess(input: {
  applicationCode: string;
}): Promise<PublicExamAccess> {
  if (!db) {
    return {
      state: "not_found",
      application: null,
      period: null,
      exam: null,
      attempt: null,
    };
  }

  const application = await db
    .select()
    .from(applications)
    .where(eq(applications.applicationCode, input.applicationCode.trim().toUpperCase()))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!application) {
    return {
      state: "not_found",
      application: null,
      period: null,
      exam: null,
      attempt: null,
    };
  }

  const period = await db
    .select()
    .from(applicationPeriods)
    .where(eq(applicationPeriods.id, application.applicationPeriodId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!period) {
    return {
      state: "no_exam_for_session",
      application,
      period: null,
      exam: null,
      attempt: null,
    };
  }

  if (application.status !== "approved") {
    return {
      state: "not_approved",
      application,
      period,
      exam: null,
      attempt: null,
    };
  }

  const exam = await getActiveExamForPeriod(period.id);
  if (!exam) {
    return {
      state: "no_exam_for_session",
      application,
      period,
      exam: null,
      attempt: null,
    };
  }

  const attempt = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.applicationId, application.id),
        eq(examAttempts.examId, exam.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const attemptState = mapAttemptState(attempt);
  if (attemptState === "submitted") {
    return { state: "submitted", application, period, exam, attempt };
  }
  if (attemptState === "in_progress") {
    return { state: "in_progress", application, period, exam, attempt };
  }

  const now = new Date();
  if (now < new Date(period.examStartDate)) {
    return { state: "exam_not_started", application, period, exam, attempt };
  }
  if (now > new Date(period.examEndDate)) {
    return { state: "exam_closed", application, period, exam, attempt };
  }

  return { state: "ready", application, period, exam, attempt };
}

export async function getQuestionBankPage(input: {
  page?: number;
  pageSize?: number;
  q?: string;
  subject?: string;
  difficulty?: Question["difficulty"];
}) {
  if (!db) {
    return {
      questions: [],
      total: 0,
      page: 1,
      pageSize: input.pageSize ?? 20,
    };
  }

  const pageSize = Math.max(1, input.pageSize ?? 20);
  const page = Math.max(1, input.page ?? 1);
  const conditions: SQL[] = [];

  if (input.subject?.trim()) {
    conditions.push(eq(questions.subject, input.subject.trim()));
  }
  if (input.difficulty) {
    conditions.push(eq(questions.difficulty, input.difficulty));
  }
  if (input.q?.trim()) {
    const q = `%${input.q.trim()}%`;
    conditions.push(
      or(
        ilike(questions.questionText, q),
        ilike(questions.subject, q),
        ilike(questions.explanation, q)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const start = (page - 1) * pageSize;
  const [rows, totalRows] = await Promise.all([
    where
      ? db
          .select()
          .from(questions)
          .where(where)
          .orderBy(desc(questions.createdAt))
          .limit(pageSize)
          .offset(start)
      : db
          .select()
          .from(questions)
          .orderBy(desc(questions.createdAt))
          .limit(pageSize)
          .offset(start),
    where
      ? db.select({ count: count() }).from(questions).where(where)
      : db.select({ count: count() }).from(questions),
  ]);

  return {
    questions: rows,
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

export async function getQuestionBankSubjects() {
  if (!db) return [];
  const all = await db.select({ subject: questions.subject }).from(questions);
  return [...new Set(all.map((row) => row.subject?.trim()).filter(Boolean) as string[])].sort();
}

export async function getQuestionsByIds(questionIds: string[]) {
  if (!db || questionIds.length === 0) return [];
  return db.select().from(questions).where(inArray(questions.id, questionIds));
}
