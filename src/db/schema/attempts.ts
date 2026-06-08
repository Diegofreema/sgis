import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  integer,
  boolean,
  numeric,
  text,
} from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { applications } from "./applications";
import { exams, questions } from "./exams";

export const examAttemptStatusEnum = pgEnum("exam_attempt_status", [
  "not_started",
  "in_progress",
  "submitted",
  "expired",
  "graded",
]);

export const examAttempts = pgTable("exam_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  score: numeric("score", { precision: 8, scale: 2 }),
  totalMarks: integer("total_marks"),
  status: examAttemptStatusEnum("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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

export type ExamAttempt = typeof examAttempts.$inferSelect;
export type NewExamAttempt = typeof examAttempts.$inferInsert;
export type ExamAnswer = typeof examAnswers.$inferSelect;
export type NewExamAnswer = typeof examAnswers.$inferInsert;
