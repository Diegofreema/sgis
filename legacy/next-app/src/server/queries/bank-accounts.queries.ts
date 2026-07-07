import { db, bankAccounts } from "@/db";
import { eq, desc } from "drizzle-orm";

function isMissingTableError(error: unknown) {
  return (error as { cause?: { code?: string } }).cause?.code === "42P01";
}

/** All bank accounts (for admin management) */
export async function listBankAccounts() {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(bankAccounts)
      .orderBy(desc(bankAccounts.createdAt));
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    return [];
  }
}

/** Active bank accounts only (shown to users on payments page) */
export async function getActiveBankAccounts() {
  if (!db) return [];
  try {
    return await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true))
      .orderBy(desc(bankAccounts.createdAt));
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    return [];
  }
}

export async function getBankAccountById(id: string) {
  if (!db) return null;
  try {
    const result = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    return null;
  }
}
