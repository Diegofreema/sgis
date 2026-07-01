"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ExamStatus = "idle" | "instructions" | "in_progress" | "submitted";
type SyncState = "saved" | "saving" | "offline";

type PersistedExamSession = {
  currentQuestionIndex: number;
  localAnswers: Record<string, string>;
  flaggedQuestionIds: string[];
  unsyncedAnswers: Record<string, string | null>;
};

type ExamStore = {
  activeSessionKey: string | null;
  sessions: Record<string, PersistedExamSession>;
  timerSeconds: number;
  examStatus: ExamStatus;
  syncState: SyncState;
  setActiveSession: (sessionKey: string) => void;
  initializeSession: (sessionKey: string) => void;
  setCurrentQuestion: (sessionKey: string, index: number) => void;
  setAnswer: (sessionKey: string, questionId: string, option: string) => void;
  toggleFlag: (sessionKey: string, questionId: string) => void;
  markSyncState: (state: SyncState) => void;
  markAnswerSynced: (sessionKey: string, questionId: string) => void;
  setTimer: (seconds: number) => void;
  tickTimer: () => void;
  setExamStatus: (status: ExamStatus) => void;
  clearSession: (sessionKey: string) => void;
  resetRuntime: () => void;
};

function emptySession(): PersistedExamSession {
  return {
    currentQuestionIndex: 0,
    localAnswers: {},
    flaggedQuestionIds: [],
    unsyncedAnswers: {},
  };
}

function ensureSession(
  sessions: Record<string, PersistedExamSession>,
  sessionKey: string
) {
  return sessions[sessionKey] ?? emptySession();
}

export const useExamStore = create<ExamStore>()(
  persist(
    (set) => ({
      activeSessionKey: null,
      sessions: {},
      timerSeconds: 0,
      examStatus: "idle",
      syncState: "saved",

      setActiveSession: (activeSessionKey) => set({ activeSessionKey }),

      initializeSession: (sessionKey) =>
        set((state) => ({
          activeSessionKey: sessionKey,
          sessions: {
            ...state.sessions,
            [sessionKey]: ensureSession(state.sessions, sessionKey),
          },
        })),

      setCurrentQuestion: (sessionKey, index) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionKey]: {
              ...ensureSession(state.sessions, sessionKey),
              currentQuestionIndex: index,
            },
          },
        })),

      setAnswer: (sessionKey, questionId, option) =>
        set((state) => {
          const session = ensureSession(state.sessions, sessionKey);
          return {
            sessions: {
              ...state.sessions,
              [sessionKey]: {
                ...session,
                localAnswers: {
                  ...session.localAnswers,
                  [questionId]: option,
                },
                unsyncedAnswers: {
                  ...session.unsyncedAnswers,
                  [questionId]: option,
                },
              },
            },
            syncState: "saving",
          };
        }),

      toggleFlag: (sessionKey, questionId) =>
        set((state) => {
          const session = ensureSession(state.sessions, sessionKey);
          const nextFlags = session.flaggedQuestionIds.includes(questionId)
            ? session.flaggedQuestionIds.filter((id) => id !== questionId)
            : [...session.flaggedQuestionIds, questionId];

          return {
            sessions: {
              ...state.sessions,
              [sessionKey]: {
                ...session,
                flaggedQuestionIds: nextFlags,
              },
            },
          };
        }),

      markSyncState: (syncState) => set({ syncState }),

      markAnswerSynced: (sessionKey, questionId) =>
        set((state) => {
          const session = ensureSession(state.sessions, sessionKey);
          const nextUnsynced = { ...session.unsyncedAnswers };
          delete nextUnsynced[questionId];

          return {
            sessions: {
              ...state.sessions,
              [sessionKey]: {
                ...session,
                unsyncedAnswers: nextUnsynced,
              },
            },
            syncState: Object.keys(nextUnsynced).length > 0 ? "saving" : "saved",
          };
        }),

      setTimer: (timerSeconds) => set({ timerSeconds }),

      tickTimer: () =>
        set((state) => ({ timerSeconds: Math.max(0, state.timerSeconds - 1) })),

      setExamStatus: (examStatus) => set({ examStatus }),

      clearSession: (sessionKey) =>
        set((state) => {
          const nextSessions = { ...state.sessions };
          delete nextSessions[sessionKey];
          return {
            sessions: nextSessions,
            syncState: "saved",
            activeSessionKey:
              state.activeSessionKey === sessionKey ? null : state.activeSessionKey,
          };
        }),

      resetRuntime: () =>
        set({
          activeSessionKey: null,
          timerSeconds: 0,
          examStatus: "idle",
          syncState: "saved",
        }),
    }),
    {
      name: "sgis-exam-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
      }),
    }
  )
);
