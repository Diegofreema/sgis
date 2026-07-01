import { requireRole } from "@/lib/auth";
import { listBankAccounts } from "@/server/queries/bank-accounts.queries";
import { getAdmissionSettings } from "@/server/queries/settings.queries";
import { getAllApplicationPeriods } from "@/server/queries/applications.queries";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const [bankAccounts, admissionSettings, applicationPeriods] = await Promise.all([
    listBankAccounts(),
    getAdmissionSettings(),
    getAllApplicationPeriods(),
  ]);
  return (
    <SettingsClient
      bankAccounts={bankAccounts}
      admissionSettings={admissionSettings}
      applicationPeriods={applicationPeriods}
    />
  );
}
