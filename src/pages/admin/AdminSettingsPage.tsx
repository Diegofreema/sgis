import { useCallback, useEffect, useState } from "react";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { SettingsClient } from "@/components/admin/SettingsClient";
import { getAdmissionSettings, getAllApplicationPeriods, type AdmissionSettings, type ApplicationPeriod } from "@/lib/queries";
import { listBankAccounts, type BankAccount } from "@/lib/admin-settings";

export function AdminSettingsPage() {
  const [data, setData] = useState<{
    bankAccounts: BankAccount[];
    admissionSettings: AdmissionSettings | null;
    applicationPeriods: ApplicationPeriod[];
  } | null>(null);

  const load = useCallback(() => {
    Promise.all([listBankAccounts(), getAdmissionSettings(), getAllApplicationPeriods()])
      .then(([bankAccounts, admissionSettings, applicationPeriods]) =>
        setData({ bankAccounts, admissionSettings, applicationPeriods }),
      )
      .catch((e) => console.error("[admin settings]", e));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <AdminLoading />;

  return (
    <SettingsClient
      bankAccounts={data.bankAccounts}
      admissionSettings={data.admissionSettings}
      applicationPeriods={data.applicationPeriods}
      onChanged={load}
    />
  );
}
