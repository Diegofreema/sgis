import { requireRole } from "@/lib/auth";
import { listBankAccounts } from "@/server/queries/bank-accounts.queries";
import { getAdmissionSettings } from "@/server/queries/settings.queries";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const [bankAccounts, admissionSettings] = await Promise.all([
    listBankAccounts(),
    getAdmissionSettings(),
  ]);
  return <SettingsClient bankAccounts={bankAccounts} admissionSettings={admissionSettings} />;
}
