export const ANNOUNCEMENT_TITLE_WORD_LIMIT = 12;
export const ANNOUNCEMENT_EXCERPT_WORD_LIMIT = 24;
export const ANNOUNCEMENT_BODY_WORD_LIMIT = 48;

type AnnouncementLengthInput = {
  title?: string | null;
  excerpt?: string | null;
  body?: string | null;
};

type AnnouncementLengthIssue = {
  field: "title" | "excerpt" | "body";
  message: string;
};

export function countWords(value: string | null | undefined) {
  return (value?.trim().match(/\S+/g) ?? []).length;
}

export function getAnnouncementLengthIssues(input: AnnouncementLengthInput) {
  const issues: AnnouncementLengthIssue[] = [];

  if (countWords(input.title) > ANNOUNCEMENT_TITLE_WORD_LIMIT) {
    issues.push({
      field: "title",
      message: `Titles must be ${ANNOUNCEMENT_TITLE_WORD_LIMIT} words or fewer. Use News instead for longer content.`,
    });
  }

  if (input.excerpt && countWords(input.excerpt) > ANNOUNCEMENT_EXCERPT_WORD_LIMIT) {
    issues.push({
      field: "excerpt",
      message: `Excerpts must be ${ANNOUNCEMENT_EXCERPT_WORD_LIMIT} words or fewer. Use News instead for longer content.`,
    });
  }

  if (countWords(input.body) > ANNOUNCEMENT_BODY_WORD_LIMIT) {
    issues.push({
      field: "body",
      message: `Announcements must be ${ANNOUNCEMENT_BODY_WORD_LIMIT} words or fewer. Use News instead for longer content.`,
    });
  }

  return issues;
}
