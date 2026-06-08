"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExamTimer } from "@/components/exam/ExamTimer";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { QuestionNavigator } from "@/components/exam/QuestionNavigator";
import { SubmitExamDialog } from "@/components/exam/SubmitExamDialog";
import { useExamStore } from "@/store/exam-store";
import { saveAnswer, submitExam } from "@/server/actions/exam.actions";
import { cn } from "@/lib/utils";
import type { Exam } from "@/db/schema/exams";
import type { StudentQuestion } from "@/types/exam";

type Props = {
  attemptId: string;
  exam: Exam;
  questions: StudentQuestion[];
  secondsRemaining: number;
};

export function ExamPortalClient({
  attemptId,
  exam,
  questions,
  secondsRemaining,
}: Props) {
  const router = useRouter();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  const {
    currentQuestionIndex,
    localAnswers,
    flaggedQuestions,
    setCurrentQuestion,
    setAnswer,
    toggleFlag,
    setExamStatus,
    resetExam,
  } = useExamStore();

  useEffect(() => {
    setExamStatus("in_progress");
    return () => resetExam();
  }, [setExamStatus, resetExam]);

  const handleExpire = useCallback(async () => {
    if (autoSubmitting) return;
    setAutoSubmitting(true);
    toast.warning("Time's up! Submitting your exam…");
    const result = await submitExam(attemptId);
    if (result.success) {
      router.push("/dashboard/results");
    }
  }, [attemptId, autoSubmitting, router]);

  const handleSelectOption = useCallback(
    async (questionId: string, option: string) => {
      setAnswer(questionId, option);
      // Save to server progressively
      const result = await saveAnswer(attemptId, questionId, option);
      if (!result.success) {
        toast.error("Failed to save answer. Please try again.");
      }
    },
    [attemptId, setAnswer]
  );

  const handleSubmit = useCallback(async () => {
    const result = await submitExam(attemptId);
    if (result.success) {
      toast.success("Examination submitted successfully!");
      router.push("/dashboard/results");
    } else {
      toast.error(result.error);
    }
  }, [attemptId, router]);

  const currentQuestion = questions[currentQuestionIndex];
  const answeredIds = new Set(Object.keys(localAnswers));
  const answeredCount = Object.keys(localAnswers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6 gap-4 bg-background/95 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:block">
            <p className="font-serif font-semibold text-sm text-foreground truncate max-w-xs">
              {exam.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {answeredCount}/{questions.length} answered
          </span>
          <ExamTimer totalSeconds={secondsRemaining} onExpire={handleExpire} />
          <Button
            size="sm"
            onClick={() => setSubmitDialogOpen(true)}
            className="gap-1.5 font-medium shadow-brand-sm h-8 text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Submit</span>
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <Progress value={progress} className="h-0.5 rounded-none" />

      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-2xl mx-auto">
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              selectedOption={localAnswers[currentQuestion.id]}
              isFlagged={flaggedQuestions.has(currentQuestion.id)}
              onSelectOption={(opt) => handleSelectOption(currentQuestion.id, opt)}
              onToggleFlag={() => toggleFlag(currentQuestion.id)}
            />

            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestion(currentQuestionIndex - 1)}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentQuestion(currentQuestionIndex + 1)}
                  className="gap-1.5"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setSubmitDialogOpen(true)}
                  className="gap-1.5 font-medium"
                >
                  <Send className="h-4 w-4" /> Submit Exam
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar navigator (desktop) */}
        <aside className="hidden lg:flex w-64 border-l border-border flex-col p-4 overflow-y-auto bg-muted/20 shrink-0">
          <QuestionNavigator
            total={questions.length}
            current={currentQuestionIndex}
            answeredIds={answeredIds}
            flaggedIds={flaggedQuestions}
            questionIds={questions.map((q) => q.id)}
            onSelect={setCurrentQuestion}
          />
        </aside>
      </div>

      {/* Submit dialog */}
      <SubmitExamDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onConfirm={handleSubmit}
        answeredCount={answeredCount}
        totalCount={questions.length}
      />
    </div>
  );
}
