"use client";

import { useEffect, useRef, useCallback } from "react";
import { useExamStore } from "@/store/exam-store";
import { EXAM_TIMER_WARNING_THRESHOLD } from "@/constants/exam";

export function useExamTimer(onExpire: () => void) {
  const { timerSeconds, tickTimer, setTimer } = useExamStore();
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Tick every second
  useEffect(() => {
    if (timerSeconds <= 0) {
      onExpireRef.current();
      return;
    }

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerSeconds, tickTimer]);

  const initTimer = useCallback(
    (seconds: number) => {
      setTimer(seconds);
    },
    [setTimer]
  );

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const isWarning = timerSeconds <= EXAM_TIMER_WARNING_THRESHOLD && timerSeconds > 0;
  const isExpired = timerSeconds <= 0;

  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return { timerSeconds, minutes, seconds, formatted, isWarning, isExpired, initTimer };
}
