"use client";

import { useEffect, useRef, useCallback } from "react";
import { useExamStore } from "@/store/exam-store";
import { EXAM_TIMER_WARNING_THRESHOLD } from "@/constants/exam";

export function useExamTimer(onExpire: () => void) {
  const { timerSeconds, tickTimer, setTimer } = useExamStore();
  const onExpireRef = useRef(onExpire);
  const startedRef = useRef(false);
  const previousSecondsRef = useRef<number | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!startedRef.current) return;

    if (
      previousSecondsRef.current != null &&
      previousSecondsRef.current > 0 &&
      timerSeconds <= 0 &&
      !expiredRef.current
    ) {
      expiredRef.current = true;
      previousSecondsRef.current = timerSeconds;
      onExpireRef.current();
      return;
    }

    previousSecondsRef.current = timerSeconds;
    if (timerSeconds <= 0) return;

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerSeconds, tickTimer]);

  const initTimer = useCallback(
    (seconds: number) => {
      startedRef.current = true;
      previousSecondsRef.current = null;
      expiredRef.current = false;
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
