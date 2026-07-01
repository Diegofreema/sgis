import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const PUBLIC_EXAM_ACCESS_COOKIE = "sgis_public_exam_session";
export const PUBLIC_EXAM_OTP_TTL_MINUTES = 10;
export const PUBLIC_EXAM_RESEND_COOLDOWN_SECONDS = 60;
export const PUBLIC_EXAM_MAX_CODE_ATTEMPTS = 5;
export const PUBLIC_EXAM_PREVIEW_WINDOW_MINUTES = 60;
export const PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES = 5;
const PUBLIC_EXAM_SESSION_TTL_HOURS = 12;

export type PublicExamWindowPhase =
  | "too_early"
  | "preview"
  | "verification"
  | "live"
  | "closed";

export function createOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function createOtpSalt() {
  return randomBytes(16).toString("hex");
}

export function hashOtpCode(code: string, salt: string) {
  return scryptSync(code, salt, 32).toString("hex");
}

export function verifyOtpCode(input: {
  code: string;
  salt: string;
  expectedHash: string;
}) {
  const actual = Buffer.from(hashOtpCode(input.code, input.salt), "hex");
  const expected = Buffer.from(input.expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function getOtpExpiryDate(now = new Date()) {
  return new Date(now.getTime() + PUBLIC_EXAM_OTP_TTL_MINUTES * 60 * 1000);
}

export function getSessionExpiryDate(examEndDate: Date | string, now = new Date()) {
  const examEnd = new Date(examEndDate);
  const maxSession = new Date(now.getTime() + PUBLIC_EXAM_SESSION_TTL_HOURS * 60 * 60 * 1000);
  return examEnd.getTime() < maxSession.getTime() ? examEnd : maxSession;
}

export function getPublicExamWindow(
  input: { examStartDate: Date | string; examEndDate: Date | string },
  now = new Date()
) {
  const examStartAt = new Date(input.examStartDate);
  const examEndAt = new Date(input.examEndDate);
  const previewOpensAt = new Date(
    examStartAt.getTime() - PUBLIC_EXAM_PREVIEW_WINDOW_MINUTES * 60 * 1000
  );
  const verificationOpensAt = new Date(
    examStartAt.getTime() - PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES * 60 * 1000
  );

  let phase: PublicExamWindowPhase = "closed";
  if (now > examEndAt) {
    phase = "closed";
  } else if (now >= examStartAt) {
    phase = "live";
  } else if (now >= verificationOpensAt) {
    phase = "verification";
  } else if (now >= previewOpensAt) {
    phase = "preview";
  } else {
    phase = "too_early";
  }

  return {
    phase,
    examStartAt,
    examEndAt,
    previewOpensAt,
    verificationOpensAt,
  };
}

export function maskEmailAddress(email: string) {
  const [localPart, domain = ""] = email.split("@");
  const safeLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? "*"}*`
      : `${localPart[0]}${"*".repeat(Math.max(1, localPart.length - 2))}${localPart.at(-1)}`;
  return `${safeLocal}@${domain}`;
}

export async function setPublicExamAccessCookie(sessionId: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(PUBLIC_EXAM_ACCESS_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/entrance-exam/exam",
    expires: expiresAt,
  });
}

export async function clearPublicExamAccessCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PUBLIC_EXAM_ACCESS_COOKIE);
}

export async function getPublicExamAccessCookieValue() {
  const cookieStore = await cookies();
  return cookieStore.get(PUBLIC_EXAM_ACCESS_COOKIE)?.value ?? null;
}
