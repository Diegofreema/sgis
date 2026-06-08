import { db, bankAccounts } from "@/db";
import { eq, desc } from "drizzle-orm";

/** All bank accounts (for admin management) */
export async function listBankAccounts() {
  if (!db) return [];
  return db
    .select()
    .from(bankAccounts)
    .orderBy(desc(bankAccounts.createdAt));
}

/** Active bank accounts only (shown to users on payments page) */
export async function getActiveBankAccounts() {
  if (!db) return [];
  return db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true))
    .orderBy(desc(bankAccounts.createdAt));
}

export async function getBankAccountById(id: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.id, id))
    .limit(1);
  return result[0] ?? null;
}
