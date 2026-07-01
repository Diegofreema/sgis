export const APPLICATION_STATUS = {
  PENDING: "pending",
  DRAFT: "draft",
  PENDING_PAYMENT: "pending_payment",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export const APPLICATION_PERIOD_STATUS = {
  UPCOMING: "upcoming",
  OPEN: "open",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export type ApplicationPeriodStatus =
  (typeof APPLICATION_PERIOD_STATUS)[keyof typeof APPLICATION_PERIOD_STATUS];

export const EXAM_ATTEMPT_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  EXPIRED: "expired",
  GRADED: "graded",
} as const;

export type ExamAttemptStatus = (typeof EXAM_ATTEMPT_STATUS)[keyof typeof EXAM_ATTEMPT_STATUS];

export const CONTENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];

/** Human-readable labels */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Pending",
  draft: "Draft",
  pending_payment: "Pending Payment",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: "warning",
  draft: "secondary",
  pending_payment: "warning",
  submitted: "blue",
  under_review: "yellow",
  approved: "success",
  rejected: "destructive",
};
