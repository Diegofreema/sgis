import type { ExamAttemptStatus } from "@/constants/statuses";
import type { ExamStatus, QuestionDifficulty, QuestionType } from "@/constants/exam";

export type QuestionOption = {
  id: string; // "a" | "b" | "c" | "d"
  text: string;
};

/** Full question — only used server-side / admin */
export type Question = {
  id: string;
  examId: string | null;
  questionText: string;
  questionImageUrl: string | null;
  options: QuestionOption[];
  correctOption: string; // NEVER sent to student during exam
  explanation: string | null;
  marks: number;
  difficulty: QuestionDifficulty;
  subject: string | null;
  type: QuestionType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Student-safe question — correct answer stripped */
export type StudentQuestion = Omit<Question, "correctOption" | "explanation">;

export type Exam = {
  id: string;
  applicationPeriodId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingScore: number;
  randomizeQuestions: boolean;
  showResultImmediately: boolean;
  resultReleaseDate: string | null;
  status: ExamStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  applicationId: string;
  userId: string | null;
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string;
  questionOrder: string[];
  score: number | null;
  totalMarks: number | null;
  passed: boolean | null;
  status: ExamAttemptStatus;
  createdAt: string;
  updatedAt: string;
};

export type ExamAnswer = {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOption: string | null;
  isCorrect: boolean | null;
  marksAwarded: number | null;
  createdAt: string;
  updatedAt: string;
};

/** What the exam store holds locally during exam */
export type LocalAnswerMap = Map<string, string>; // questionId → selectedOption
