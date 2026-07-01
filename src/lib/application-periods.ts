import type { ApplicationPeriod } from "@/db/schema/applications";

const academicSessionPattern = /^(\d{4})\s*\/\s*(\d{4})$/;

export function formatAcademicSession(date: Date) {
  const year = date.getFullYear();
  return `${year}/${year + 1}`;
}

export function parseAcademicSession(session: string) {
  const match = session.trim().match(academicSessionPattern);
  if (!match) return undefined;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) return undefined;

  return new Date(startYear, 0, 1);
}

export function isValidAcademicSession(session: string) {
  return Boolean(parseAcademicSession(session));
}

export function isApplicationPeriodActive(
  period: Pick<ApplicationPeriod, "status" | "applicationStartDate" | "applicationEndDate">,
  now = new Date()
) {
  return (
    period.status === "open" &&
    now >= new Date(period.applicationStartDate) &&
    now <= new Date(period.applicationEndDate)
  );
}
