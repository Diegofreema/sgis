"use client";

import { useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExamTimer } from "@/hooks/use-exam-timer";
import { EXAM_TIMER_WARNING_THRESHOLD } from "@/constants/exam";

type ExamTimerProps = {
  totalSeconds: number;
  onExpire: () => void;
};

export function ExamTimer({ totalSeconds, onExpire }: ExamTimerProps) {
  const { formatted, isWarning, initTimer } = useExamTimer(onExpire);

  useEffect(() => {
    initTimer(totalSeconds);
  }, [totalSeconds, initTimer]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono font-semibold transition-colors",
        isWarning
          ? "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
          : "bg-muted text-foreground"
      )}
      aria-live="polite"
      aria-label={`Time remaining: ${formatted}`}
    >
      <Clock className="h-4 w-4" />
      {formatted}
    </div>
  );
}
