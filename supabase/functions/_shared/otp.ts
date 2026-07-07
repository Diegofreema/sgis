// OTP crypto — ported verbatim from legacy src/lib/public-exam-access.ts.
// Deno supports node:crypto, so scrypt + timing-safe compare are identical.
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

export const PUBLIC_EXAM_OTP_TTL_MINUTES = 10;
export const PUBLIC_EXAM_RESEND_COOLDOWN_SECONDS = 60;
export const PUBLIC_EXAM_MAX_CODE_ATTEMPTS = 5;
export const PUBLIC_EXAM_VERIFICATION_WINDOW_MINUTES = 5;
export const PUBLIC_EXAM_PREVIEW_WINDOW_MINUTES = 60;
const PUBLIC_EXAM_SESSION_TTL_HOURS = 12;

export function createOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function createOtpSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashOtpCode(code: string, salt: string): string {
  return scryptSync(code, salt, 32).toString("hex");
}

export function verifyOtpCode(input: {
  code: string;
  salt: string;
  expectedHash: string;
}): boolean {
  const actual = Buffer.from(hashOtpCode(input.code, input.salt), "hex");
  const expected = Buffer.from(input.expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function getOtpExpiryDate(now = new Date()): Date {
  return new Date(now.getTime() + PUBLIC_EXAM_OTP_TTL_MINUTES * 60 * 1000);
}

export function getSessionExpiryDate(examEndDate: Date | string, now = new Date()): Date {
  const examEnd = new Date(examEndDate);
  const maxSession = new Date(now.getTime() + PUBLIC_EXAM_SESSION_TTL_HOURS * 60 * 60 * 1000);
  return examEnd.getTime() < maxSession.getTime() ? examEnd : maxSession;
}

export function maskEmailAddress(email: string): string {
  const [localPart, domain = ""] = email.split("@");
  const safeLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? "*"}*`
      : `${localPart[0]}${"*".repeat(Math.max(1, localPart.length - 2))}${localPart.at(-1)}`;
  return `${safeLocal}@${domain}`;
}
