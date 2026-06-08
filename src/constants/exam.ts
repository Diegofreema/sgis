export const EXAM_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

export const QUESTION_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTY)[keyof typeof QUESTION_DIFFICULTY];

export const QUESTION_TYPE = {
  SINGLE_CHOICE: "single_choice",
  // Future types reserved:
  // MULTIPLE_CHOICE: "multiple_choice",
  // SHORT_ANSWER: "short_answer",
  // ESSAY: "essay",
  // FILE_UPLOAD: "file_upload",
} as const;

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

/** Number of options per single-choice question */
export const SINGLE_CHOICE_OPTIONS = 4;

/** Auto-submit warning threshold in seconds */
export const EXAM_TIMER_WARNING_THRESHOLD = 300; // 5 minutes
