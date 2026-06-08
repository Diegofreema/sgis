import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { applicationPeriods } from "./applications";

export const examStatusEnum = pgEnum("exam_status", [
  "draft",
  "active",
  "closed",
  "archived",
]);

export const questionDifficultyEnum = pgEnum("question_difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "single_choice",
  // reserved for future: "multiple_choice", "short_answer", "essay", "file_upload"
]);

export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationPeriodId: uuid("application_period_id")
    .notNull()
    .references(() => applicationPeriods.id),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  totalMarks: integer("total_marks").notNull().default(100),
  passingScore: integer("passing_score").notNull().default(50),
  randomizeQuestions: boolean("randomize_questions").notNull().default(false),
  showResultImmediately: boolean("show_result_immediately").notNull().default(false),
  resultReleaseDate: timestamp("result_release_date", { withTimezone: true }),
  status: examStatusEnum("status").notNull().default("draft"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuestionOptionDb = { id: string; text: string };

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionImageUrl: text("question_image_url"),
  // options stored as JSON: [{ id: "a", text: "..." }, ...]
  options: jsonb("options").$type<QuestionOptionDb[]>().notNull().default([]),
  // correctOption is the option id ("a" | "b" | "c" | "d")
  // CRITICAL: NEVER expose this field in student-facing queries
  correctOption: text("correct_option").notNull(),
  explanation: text("explanation"),
  marks: numeric("marks", { precision: 6, scale: 2 }).notNull().default("1"),
  difficulty: questionDifficultyEnum("difficulty").notNull().default("medium"),
  subject: text("subject"),
  type: questionTypeEnum("type").notNull().default("single_choice"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
