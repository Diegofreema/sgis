"use client";

import { create } from "zustand";

type ExamStatus = "idle" | "instructions" | "in_progress" | "submitted";

type ExamStore = {
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** Locally selected answers: questionId → selectedOption */
  localAnswers: Record<string, string>;
  /** Flagged question IDs */
  flaggedQuestions: Set<string>;
  /** Timer: seconds remaining */
  timerSeconds: number;
  /** Overall exam UI state */
  examStatus: ExamStatus;

  // Actions
  setCurrentQuestion: (index: number) => void;
  setAnswer: (questionId: string, option: string) => void;
  toggleFlag: (questionId: string) => void;
  setTimer: (seconds: number) => void;
  tickTimer: () => void;
  setExamStatus: (status: ExamStatus) => void;
  resetExam: () => void;
};

export const useExamStore = create<ExamStore>((set) => ({
  currentQuestionIndex: 0,
  localAnswers: {},
  flaggedQuestions: new Set(),
  timerSeconds: 0,
  examStatus: "idle",

  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),

  setAnswer: (questionId, option) =>
    set((s) => ({
      localAnswers: { ...s.localAnswers, [questionId]: option },
    })),

  toggleFlag: (questionId) =>
    set((s) => {
      const next = new Set(s.flaggedQuestions);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return { flaggedQuestions: next };
    }),

  setTimer: (timerSeconds) => set({ timerSeconds }),

  tickTimer: () =>
    set((s) => ({ timerSeconds: Math.max(0, s.timerSeconds - 1) })),

  setExamStatus: (examStatus) => set({ examStatus }),

  resetExam: () =>
    set({
      currentQuestionIndex: 0,
      localAnswers: {},
      flaggedQuestions: new Set(),
      timerSeconds: 0,
      examStatus: "idle",
    }),
}));
