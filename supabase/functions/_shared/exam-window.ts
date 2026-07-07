// Exam window phases — ported from legacy getPublicExamWindow.
import {
  PUBLIC_EXAM_PREVIEW_WINDOW_MINUTES,
  PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES,
} from "./otp.ts";

export type PublicExamWindowPhase =
  | "too_early"
  | "preview"
  | "verification"
  | "live"
  | "closed";

export function getPublicExamWindow(
  input: { examStartDate: Date | string; examEndDate: Date | string },
  now = new Date(),
) {
  const examStartAt = new Date(input.examStartDate);
  const examEndAt = new Date(input.examEndDate);
  const previewOpensAt = new Date(
    examStartAt.getTime() - PUBLIC_EXAM_PREVIEW_WINDOW_MINUTES * 60 * 1000,
  );
  const verificationOpensAt = new Date(
    examStartAt.getTime() - PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES * 60 * 1000,
  );

  let phase: PublicExamWindowPhase = "closed";
  if (now > examEndAt) phase = "closed";
  else if (now >= examStartAt) phase = "live";
  else if (now >= verificationOpensAt) phase = "verification";
  else if (now >= previewOpensAt) phase = "preview";
  else phase = "too_early";

  return { phase, examStartAt, examEndAt, previewOpensAt, verificationOpensAt };
}

/** Fisher-Yates shuffle (legacy `shuffle`), for question order per attempt. */
export function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
