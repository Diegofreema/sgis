import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  integer,
  boolean,
  numeric,
  text,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { applicationPeriods, applications } from "./applications";
import { exams, questions } from "./exams";

export const examAttemptStatusEnum = pgEnum("exam_attempt_status", [
  "not_started",
  "in_progress",
  "submitted",
  "expired",
  "graded",
]);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    userId: uuid("user_id")
      .references(() => profiles.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    questionOrder: jsonb("question_order").$type<string[]>().notNull().default([]),
    score: numeric("score", { precision: 8, scale: 2 }),
    totalMarks: integer("total_marks"),
    passed: boolean("passed"),
    status: examAttemptStatusEnum("status").notNull().default("in_progress"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    applicationExamIdx: uniqueIndex("exam_attempts_application_exam_idx").on(
      table.applicationId,
      table.examId
    ),
  })
);

export const examAnswers = pgTable("exam_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  attemptId: uuid("attempt_id")
    .notNull()
    .references(() => examAttempts.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  selectedOption: text("selected_option"), // null = unanswered
  isCorrect: boolean("is_correct"),
  marksAwarded: numeric("marks_awarded", { precision: 6, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const publicExamAccessSessions = pgTable(
  "public_exam_access_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    applicationPeriodId: uuid("application_period_id")
      .notNull()
      .references(() => applicationPeriods.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    codeSalt: text("code_salt").notNull(),
    codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }).notNull(),
    codeAttemptCount: integer("code_attempt_count").notNull().default(0),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    sessionExpiresAt: timestamp("session_expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    applicationExamIdx: index("public_exam_access_sessions_application_exam_idx").on(
      table.applicationId,
      table.examId
    ),
    examExpiryIdx: index("public_exam_access_sessions_exam_expiry_idx").on(
      table.examId,
      table.sessionExpiresAt
    ),
    applicationPeriodIdx: index("public_exam_access_sessions_application_period_idx").on(
      table.applicationPeriodId
    ),
  })
);

export type ExamAttempt = typeof examAttempts.$inferSelect;
export type NewExamAttempt = typeof examAttempts.$inferInsert;
export type ExamAnswer = typeof examAnswers.$inferSelect;
export type NewExamAnswer = typeof examAnswers.$inferInsert;
export type PublicExamAccessSession = typeof publicExamAccessSessions.$inferSelect;
export type NewPublicExamAccessSession = typeof publicExamAccessSessions.$inferInsert;
