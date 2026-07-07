import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile, type ActionResult } from "@/lib/auth";
import { isValidAcademicSession } from "@/lib/application-periods";

/**
 * Admin settings / application periods / bank accounts — supabase-js via
 * admin RLS. Faithful ports of the legacy settings/period/bank server actions.
 */

// ─── Bank accounts ──────────────────────────────────────────────────

const BANK_COLS =
  "id, bankName:bank_name, accountName:account_name, accountNumber:account_number, sortCode:sort_code, swiftCode:swift_code, routingNumber:routing_number, iban, currency, notes, isActive:is_active, createdBy:created_by, createdAt:created_at, updatedAt:updated_at";

export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string | null;
  swiftCode: string | null;
  routingNumber: string | null;
  iban: string | null;
  currency: string;
  notes: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export async function listBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select(BANK_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as BankAccount[]) ?? [];
}

type BankInput = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
  swiftCode?: string;
  routingNumber?: string;
  iban?: string;
  currency?: string;
  notes?: string;
};

function bankPatch(input: Partial<BankInput & { isActive: boolean }>) {
  const p: Record<string, unknown> = {};
  const map: Record<string, string> = {
    bankName: "bank_name",
    accountName: "account_name",
    accountNumber: "account_number",
    sortCode: "sort_code",
    swiftCode: "swift_code",
    routingNumber: "routing_number",
    iban: "iban",
    currency: "currency",
    notes: "notes",
    isActive: "is_active",
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in input) p[col] = (input as Record<string, unknown>)[k];
  }
  return p;
}

export async function createBankAccount(
  input: BankInput,
): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({ ...bankPatch(input), currency: input.currency || "NGN", created_by: profile.id })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function updateBankAccount(
  id: string,
  input: Partial<BankInput & { isActive: boolean }>,
): Promise<ActionResult> {
  const { error } = await supabase
    .from("bank_accounts")
    .update({ ...bankPatch(input), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function deleteBankAccount(id: string): Promise<ActionResult> {
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function toggleBankAccountActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const { error } = await supabase
    .from("bank_accounts")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// ─── Admission / school settings (upsert singleton) ─────────────────

async function upsertSettings(patch: Record<string, unknown>): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };
  const { error } = await supabase
    .from("admission_settings")
    .upsert(
      { singleton_key: "default", updated_by: profile.id, updated_at: new Date().toISOString(), ...patch },
      { onConflict: "singleton_key" },
    );
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export function updateAdmissionSettings(input: { notes?: string }): Promise<ActionResult> {
  return upsertSettings({ notes: input.notes?.trim() || null });
}

export function updateSchoolSettings(input: {
  schoolName: string;
  schoolEmail?: string;
  schoolPhone?: string;
  maintenanceMode: boolean;
}): Promise<ActionResult> {
  return upsertSettings({
    school_name: input.schoolName.trim() || "Sankt Georg International School",
    school_email: input.schoolEmail?.trim() || null,
    school_phone: input.schoolPhone?.trim() || null,
    maintenance_mode: input.maintenanceMode,
  });
}

// ─── Application periods ─────────────────────────────────────────────

export async function createApplicationPeriod(input: {
  title: string;
  description?: string;
  applicationStartDate: string;
  applicationEndDate: string;
  examStartDate: string;
  examEndDate: string;
  registrationFee: number;
  currency: string;
  eligibleClasses?: string[];
}): Promise<ActionResult<{ periodId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, error: "Not authorized." };
  const validationError = validateApplicationWindow(input);
  if (validationError) return { success: false, error: validationError };

  const { data, error } = await supabase
    .from("application_periods")
    .insert({
      title: input.title,
      description: input.description ?? null,
      application_start_date: new Date(input.applicationStartDate).toISOString(),
      application_end_date: new Date(input.applicationEndDate).toISOString(),
      exam_start_date: new Date(input.examStartDate).toISOString(),
      exam_end_date: new Date(input.examEndDate).toISOString(),
      registration_fee: String(input.registrationFee),
      currency: input.currency,
      eligible_classes: input.eligibleClasses ?? [],
      status: "upcoming",
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: { periodId: data.id } };
}

export async function updateApplicationPeriod(input: {
  periodId: string;
  title: string;
  applicationStartDate: string;
  applicationEndDate: string;
}): Promise<ActionResult> {
  const validationError = validateApplicationWindow(input);
  if (validationError) return { success: false, error: validationError };
  const { error } = await supabase
    .from("application_periods")
    .update({
      title: input.title.trim(),
      application_start_date: new Date(input.applicationStartDate).toISOString(),
      application_end_date: new Date(input.applicationEndDate).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.periodId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updateApplicationPeriodStatus(
  periodId: string,
  status: "upcoming" | "open" | "closed" | "archived",
): Promise<ActionResult> {
  if (status === "open") {
    const { data: period } = await supabase
      .from("application_periods")
      .select("application_end_date")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return { success: false, error: "Application session not found." };
    if (new Date() > new Date(period.application_end_date)) {
      return {
        success: false,
        error: "Past sessions cannot be opened. Extend the closing date first.",
      };
    }
    // Only one open session at a time — close the current open one.
    await supabase
      .from("application_periods")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("status", "open");
  }

  const { error } = await supabase
    .from("application_periods")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", periodId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

function validateApplicationWindow(input: {
  title: string;
  applicationStartDate: string;
  applicationEndDate: string;
  examStartDate?: string;
  examEndDate?: string;
}): string | null {
  if (!isValidAcademicSession(input.title)) {
    return "Academic session must look like 2026/2027.";
  }
  const start = new Date(input.applicationStartDate);
  const end = new Date(input.applicationEndDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Enter valid application dates.";
  }
  if (start >= end) return "Application close date must be after the open date.";

  if (input.examStartDate && input.examEndDate) {
    const es = new Date(input.examStartDate);
    const ee = new Date(input.examEndDate);
    if (Number.isNaN(es.getTime()) || Number.isNaN(ee.getTime())) {
      return "Enter valid exam dates.";
    }
    if (es >= ee) return "Exam end date must be after the exam start date.";
  }
  return null;
}
