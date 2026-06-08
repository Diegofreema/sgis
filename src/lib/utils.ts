import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";
import { format, formatDistanceToNow } from "date-fns";
import { randomBytes } from "node:crypto";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a unique reference string */
export function generateReference(prefix = "SGIS"): string {
  return `${prefix}-${nanoid(12).toUpperCase()}`;
}

/** Format currency */
export function formatCurrency(
  amount: number,
  currency = "NGN",
  locale = "en-NG"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Format date */
export function formatDate(date: string | Date, fmt = "MMM d, yyyy"): string {
  return format(new Date(date), fmt);
}

/** Relative time */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Full name from parts */
export function getFullName(
  firstName?: string | null,
  lastName?: string | null
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  return firstName ?? lastName ?? "Anonymous";
}

/** Initials for avatar fallback */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/** Truncate long text */
export function truncate(text: string, length = 120): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "…";
}

/** Dev-only sleep */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a high-entropy temporary password for first-time student logins. */
export function generateTemporaryPassword(length = 14): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

  return Array.from(randomBytes(length))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}
