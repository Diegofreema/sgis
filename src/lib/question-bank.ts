export type QuestionOptionDb = { id: string; text: string };

export const PRIMARY_SIX_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Basic Science",
  "Social Studies",
  "Civic Education",
  "Agricultural Science",
  "Computer Studies",
  "Cultural and Creative Arts",
  "Home Economics",
  "Physical and Health Education",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
] as const;

export const BULK_QUESTION_TEMPLATE_HEADERS = [
  "questionText",
  "subject",
  "difficulty",
  "marks",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "explanation",
] as const;

export const MAX_BULK_QUESTION_UPLOAD = 200;

export const BULK_QUESTION_TEMPLATE_ROW = {
  questionText: "Which of these is a mammal?",
  subject: "Basic Science",
  difficulty: "easy",
  marks: 1,
  optionA: "Eagle",
  optionB: "Whale",
  optionC: "Lizard",
  optionD: "Shark",
  correctOption: "b",
  explanation: "Whales are mammals because they give birth to live young.",
} as const;

type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionBankInput = {
  questionText: string;
  options: QuestionOptionDb[];
  correctOption: string;
  explanation?: string | null;
  marks?: number | string;
  difficulty?: QuestionDifficulty | string;
  subject?: string | null;
  sortOrder?: number;
};

export function isPrimarySixSubject(subject: string) {
  return PRIMARY_SIX_SUBJECTS.includes(
    subject as (typeof PRIMARY_SIX_SUBJECTS)[number]
  );
}

export function normalizeQuestionOptions(options: QuestionOptionDb[]) {
  return options.map((option) => ({
    id: option.id.trim().toLowerCase(),
    text: option.text.trim(),
  }));
}

export function validateQuestionBankInput(
  input: QuestionBankInput,
  options?: {
    requireKnownSubject?: boolean;
    fallbackSortOrder?: number;
  }
) {
  const questionText = input.questionText.trim();
  if (!questionText) {
    return { success: false as const, error: "Question text is required." };
  }

  const subject = input.subject?.trim() ?? "";
  if (!subject) {
    return { success: false as const, error: "Select a subject." };
  }
  if (options?.requireKnownSubject && !isPrimarySixSubject(subject)) {
    return { success: false as const, error: "Select a valid subject." };
  }

  const difficulty = String(input.difficulty ?? "medium").trim().toLowerCase();
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    return { success: false as const, error: "Choose a valid difficulty." };
  }

  const normalizedOptions = normalizeQuestionOptions(input.options);
  if (
    normalizedOptions.length !== 4 ||
    normalizedOptions.some((option) => !option.text)
  ) {
    return {
      success: false as const,
      error: "Each question needs four options.",
    };
  }

  const correctOption = input.correctOption.trim().toLowerCase();
  if (!normalizedOptions.some((option) => option.id === correctOption)) {
    return {
      success: false as const,
      error: "Choose the correct answer from options A-D.",
    };
  }

  const marks = Number(input.marks ?? 1);
  if (!Number.isFinite(marks) || marks <= 0) {
    return { success: false as const, error: "Marks must be greater than 0." };
  }

  return {
    success: true as const,
    data: {
      questionText,
      options: normalizedOptions,
      correctOption,
      explanation: input.explanation?.trim() || null,
      marks: String(marks),
      difficulty: difficulty as QuestionDifficulty,
      subject,
      sortOrder: input.sortOrder ?? options?.fallbackSortOrder ?? 0,
    },
  };
}
