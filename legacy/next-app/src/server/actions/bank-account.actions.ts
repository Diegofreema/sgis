"use server";

import { db, bankAccounts } from "@/db";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createBankAccount(input: {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
  swiftCode?: string;
  routingNumber?: string;
  iban?: string;
  currency?: string;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const [account] = await db
    .insert(bankAccounts)
    .values({
      bankName: input.bankName,
      accountName: input.accountName,
      accountNumber: input.accountNumber,
      sortCode: input.sortCode ?? null,
      swiftCode: input.swiftCode ?? null,
      routingNumber: input.routingNumber ?? null,
      iban: input.iban ?? null,
      currency: input.currency ?? "NGN",
      notes: input.notes ?? null,
      isActive: true,
      createdBy: admin.id,
    })
    .returning({ id: bankAccounts.id });

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: "bank_account.created",
    entityType: "bank_account",
    entityId: account.id,
    metadata: { bankName: input.bankName, accountNumber: input.accountNumber },
  });

  revalidatePath("/admin/settings");

  return { success: true, data: { id: account.id } };
}

export async function updateBankAccount(
  id: string,
  input: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    sortCode?: string;
    swiftCode?: string;
    routingNumber?: string;
    iban?: string;
    currency?: string;
    notes?: string;
    isActive?: boolean;
  }
): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(bankAccounts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(bankAccounts.id, id));

  await logActivity({
    actorId: admin.id,
    actorRole: "admin",
    action: "bank_account.updated",
    entityType: "bank_account",
    entityId: id,
  });

  revalidatePath("/admin/settings");

  return { success: true, data: undefined };
}

export async function deleteBankAccount(id: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db.delete(bankAccounts).where(eq(bankAccounts.id, id));

  revalidatePath("/admin/settings");

  return { success: true, data: undefined };
}

export async function toggleBankAccountActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(bankAccounts)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(bankAccounts.id, id));

  revalidatePath("/admin/settings");

  return { success: true, data: undefined };
}
