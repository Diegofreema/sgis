/**
 * Centralized permission helpers.
 *
 * Server-side checks in actions use these.
 * Client-side components may use these for UI visibility only — never for security.
 */
import type { UserProfile } from "@/types/auth";
import type { ApplicationPeriod } from "@/types/application";
import type { Exam, ExamAttempt } from "@/types/exam";
import { isAdminRole } from "@/constants/roles";
import { APPLICATION_PERIOD_STATUS } from "@/constants/statuses";
import { EXAM_ATTEMPT_STATUS } from "@/constants/statuses";

export function canManageApplications(user: UserProfile | null): boolean {
  return isAdminRole(user?.role);
}

export function canManagePayments(user: UserProfile | null): boolean {
  return isAdminRole(user?.role);
}

export function canManageCMS(user: UserProfile | null): boolean {
  return isAdminRole(user?.role);
}

export function canManageExams(user: UserProfile | null): boolean {
  return isAdminRole(user?.role);
}

export function canManageUsers(user: UserProfile | null): boolean {
  return user?.role === "admin";
}

/**
 * A student can apply for the entrance exam if:
 * 1. The application period is currently open.
 * 2. The current date is within the application window.
 */
export function canApplyForEntranceExam(
  user: UserProfile | null,
  period: ApplicationPeriod | null
): boolean {
  if (!user || !period) return false;
  if (period.status !== APPLICATION_PERIOD_STATUS.OPEN) return false;

  const now = new Date();
  const start = new Date(period.applicationStartDate);
  const end = new Date(period.applicationEndDate);

  return now >= start && now <= end;
}

/**
 * A student can take the exam if:
 * 1. Their application is approved.
 * 2. The exam is active.
 * 3. Current time is within exam window.
 * 4. They have not already submitted or expired.
 */
export function canTakeExam(
  exam: Exam | null,
  attempt: ExamAttempt | null,
  applicationStatus: string | null,
  period?: ApplicationPeriod | null
): boolean {
  if (!exam) return false;
  if (applicationStatus !== "approved") return false;
  if (exam.status !== "active") return false;

  const now = new Date();
  if (period) {
    const start = new Date(period.examStartDate);
    const end = new Date(period.examEndDate);
    if (now < start || now > end) return false;
  }

  // If no attempt yet, they can start (assuming period is valid)
  if (!attempt) return true;

  // Already submitted or expired — cannot take
  if (
    attempt.status === EXAM_ATTEMPT_STATUS.SUBMITTED ||
    attempt.status === EXAM_ATTEMPT_STATUS.EXPIRED
  ) {
    return false;
  }

  // In progress — check not expired
  if (attempt.status === EXAM_ATTEMPT_STATUS.IN_PROGRESS) {
    return now < new Date(attempt.expiresAt);
  }

  if (attempt.status === EXAM_ATTEMPT_STATUS.GRADED) {
    return false;
  }

  return false;
}

/**
 * Can a user view their exam result?
 */
export function canViewResult(
  exam: Exam | null,
  attempt: ExamAttempt | null
): boolean {
  if (!exam || !attempt) return false;
  if (attempt.status !== EXAM_ATTEMPT_STATUS.GRADED) return false;
  return !!exam.resultReleaseDate && new Date() >= new Date(exam.resultReleaseDate);
}
