"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Menu, Send, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExamTimer } from "@/components/exam/ExamTimer";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { QuestionNavigator } from "@/components/exam/QuestionNavigator";
import { SubmitExamDialog } from "@/components/exam/SubmitExamDialog";
import { saveAnswer, submitExam } from "@/server/actions/exam.actions";
import { useExamStore } from "@/store/exam-store";
import type { Exam } from "@/db/schema/exams";
import type { StudentQuestion } from "@/types/exam";

const ALERT_THRESHOLDS = [300, 60] as const;

type Props = {
  attemptId: string;
  applicationId: string;
  exam: Exam;
  questions: StudentQuestion[];
  secondsRemaining: number;
  accessMode?: "public" | "private";
};

export function ExamPortalClient({
  attemptId,
  applicationId,
  exam,
  questions,
  secondsRemaining,
  accessMode = "private",
}: Props) {
  const router = useRouter();
  const sessionKey = `${applicationId}:${attemptId}`;
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [mobileNavigatorOpen, setMobileNavigatorOpen] = useState(false);
  const syncingRef = useRef(false);
  const alertedRef = useRef<Set<number>>(new Set());

  const {
    sessions,
    timerSeconds,
    syncState,
    initializeSession,
    setCurrentQuestion,
    setAnswer,
    toggleFlag,
    markSyncState,
    markAnswerSynced,
    setExamStatus,
    clearSession,
    resetRuntime,
  } = useExamStore();

  const session = sessions[sessionKey] ?? {
    currentQuestionIndex: 0,
    localAnswers: {},
    flaggedQuestionIds: [],
    unsyncedAnswers: {},
  };

  const answeredIds = useMemo(
    () => new Set(Object.keys(session.localAnswers)),
    [session.localAnswers]
  );
  const flaggedIds = useMemo(
    () => new Set(session.flaggedQuestionIds),
    [session.flaggedQuestionIds]
  );
  const answeredCount = answeredIds.size;
  const progress =
    questions.length === 0 ? 0 : Math.round((answeredCount / questions.length) * 100);
  const currentQuestion = questions[session.currentQuestionIndex] ?? questions[0] ?? null;

  const flushUnsyncedAnswers = useCallback(async () => {
    if (syncingRef.current) return;
    const entries = Object.entries(session.unsyncedAnswers);
    if (entries.length === 0) {
      markSyncState("saved");
      return;
    }

    syncingRef.current = true;
    markSyncState("saving");

    try {
      for (const [questionId, option] of entries) {
        if (!option) continue;
        const result = await saveAnswer(attemptId, questionId, option, accessMode);
        if (!result.success) {
          markSyncState("offline");
          return;
        }
        markAnswerSynced(sessionKey, questionId);
      }
      markSyncState("saved");
    } finally {
      syncingRef.current = false;
    }
  }, [
    accessMode,
    attemptId,
    markAnswerSynced,
    markSyncState,
    session.unsyncedAnswers,
    sessionKey,
  ]);

  useEffect(() => {
    initializeSession(sessionKey);
    setExamStatus("in_progress");
    return () => resetRuntime();
  }, [initializeSession, resetRuntime, sessionKey, setExamStatus]);

  useEffect(() => {
    void flushUnsyncedAnswers();
  }, [flushUnsyncedAnswers]);

  useEffect(() => {
    function retrySync() {
      void flushUnsyncedAnswers();
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void flushUnsyncedAnswers();
      }
    }

    window.addEventListener("online", retrySync);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", retrySync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushUnsyncedAnswers]);

  useEffect(() => {
    if (
      ALERT_THRESHOLDS.includes(timerSeconds as (typeof ALERT_THRESHOLDS)[number]) &&
      !alertedRef.current.has(timerSeconds)
    ) {
      alertedRef.current.add(timerSeconds);
      if (timerSeconds === 300) {
        toast.warning("5 minutes remaining. Start wrapping up.");
      }
      if (timerSeconds === 60) {
        toast.error("1 minute left. Submit soon.", { duration: 10000 });
      }
    }
  }, [timerSeconds]);

  const handleExpire = useCallback(async () => {
    if (autoSubmitting) return;
    setAutoSubmitting(true);
    toast.warning("Time is up. Submitting your exam...");
    const answersPayload = Object.entries(session.localAnswers).map(
      ([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      })
    );
    const result = await submitExam(attemptId, accessMode, answersPayload);
    if (result.success) {
      clearSession(sessionKey);
      router.push(
        accessMode === "public"
          ? `/entrance-exam?applicationId=${encodeURIComponent(applicationId)}#status`
          : "/admin"
      );
      return;
    }
    toast.error(result.error);
    setAutoSubmitting(false);
  }, [
    accessMode,
    applicationId,
    attemptId,
    autoSubmitting,
    clearSession,
    router,
    session.localAnswers,
    sessionKey,
  ]);

  const handleSelectOption = useCallback(
    async (questionId: string, option: string) => {
      setAnswer(sessionKey, questionId, option);
      const result = await saveAnswer(attemptId, questionId, option, accessMode);
      if (!result.success) {
        markSyncState("offline");
        toast.error("Answer saved on this device. We will retry syncing.");
        return;
      }
      markAnswerSynced(sessionKey, questionId);
    },
    [accessMode, attemptId, markAnswerSynced, markSyncState, sessionKey, setAnswer]
  );

  const handleSubmit = useCallback(async () => {
    const answersPayload = Object.entries(session.localAnswers).map(
      ([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      })
    );
    const result = await submitExam(attemptId, accessMode, answersPayload);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    clearSession(sessionKey);
    toast.success("Examination submitted successfully.");
    router.push(
      accessMode === "public"
        ? `/entrance-exam?applicationId=${encodeURIComponent(applicationId)}#status`
        : "/admin"
    );
  }, [accessMode, applicationId, attemptId, clearSession, router, session.localAnswers, sessionKey]);

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <header className="z-10 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="min-w-0">
          <p className="truncate font-serif text-sm font-semibold text-foreground md:text-base">
            {exam.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {answeredCount}/{questions.length} answered
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`hidden rounded-full px-3 py-1 text-xs font-medium md:inline-flex ${
              syncState === "offline"
                ? "bg-destructive/10 text-destructive"
                : syncState === "saving"
                  ? "bg-primary/10 text-primary"
                  : "bg-success/10 text-success"
            }`}
          >
            {syncState === "offline"
              ? "Stored locally"
              : syncState === "saving"
                ? "Saving..."
                : "Saved"}
          </div>
          <ExamTimer totalSeconds={secondsRemaining} onExpire={handleExpire} />
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavigatorOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="gap-2 font-medium shadow-brand-sm"
            onClick={() => setSubmitDialogOpen(true)}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Submit</span>
          </Button>
        </div>
      </header>

      <Progress value={progress} className="h-1 rounded-none" />

      {syncState === "offline" && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          <WifiOff className="h-4 w-4" />
          Answers are still stored safely on this device. We will retry syncing.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <QuestionCard
              question={currentQuestion}
              questionNumber={session.currentQuestionIndex + 1}
              totalQuestions={questions.length}
              selectedOption={session.localAnswers[currentQuestion.id]}
              isFlagged={flaggedIds.has(currentQuestion.id)}
              onSelectOption={(option) => handleSelectOption(currentQuestion.id, option)}
              onToggleFlag={() => toggleFlag(sessionKey, currentQuestion.id)}
            />

            <div className="flex items-center justify-between border-t border-border pt-6">
              <Button
                variant="outline"
                disabled={session.currentQuestionIndex === 0}
                onClick={() => setCurrentQuestion(sessionKey, session.currentQuestionIndex - 1)}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {session.currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(sessionKey, session.currentQuestionIndex + 1)}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setSubmitDialogOpen(true)} className="gap-2">
                  Review & Submit
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 border-l border-border bg-muted/20 lg:block">
          <QuestionNavigator
            questions={questions}
            currentQuestionIndex={session.currentQuestionIndex}
            answeredQuestionIds={answeredIds}
            flaggedQuestionIds={flaggedIds}
            onSelectQuestion={(index) => setCurrentQuestion(sessionKey, index)}
          />
        </aside>
      </div>

      {mobileNavigatorOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 right-0 w-full max-w-sm border-l border-border bg-background shadow-xl">
            <QuestionNavigator
              questions={questions}
              currentQuestionIndex={session.currentQuestionIndex}
              answeredQuestionIds={answeredIds}
              flaggedQuestionIds={flaggedIds}
              onSelectQuestion={(index) => {
                setCurrentQuestion(sessionKey, index);
                setMobileNavigatorOpen(false);
              }}
              onClose={() => setMobileNavigatorOpen(false)}
            />
          </div>
        </div>
      )}

      <SubmitExamDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        flaggedCount={flaggedIds.size}
        isSubmitting={autoSubmitting}
        onConfirm={handleSubmit}
      />
    </div>
  );
}
