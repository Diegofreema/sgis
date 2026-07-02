"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  Landmark,
  X,
  Check,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  toggleBankAccountActive,
} from "@/server/actions/bank-account.actions";
import {
  createApplicationPeriod,
  updateApplicationPeriod,
  updateApplicationPeriodStatus,
} from "@/server/actions/application.actions";
import { updateAdmissionSettings, updateSchoolSettings } from "@/server/actions/settings.actions";
import type { BankAccount } from "@/db/schema/bank_accounts";
import type { AdmissionSettings } from "@/db/schema/settings";
import type { ApplicationPeriod } from "@/db/schema/applications";
import { formatAcademicSession, parseAcademicSession } from "@/lib/application-periods";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  bankAccounts: BankAccount[];
  admissionSettings: AdmissionSettings | null;
  applicationPeriods: ApplicationPeriod[];
};

type BankAccountForm = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  swiftCode: string;
  iban: string;
  currency: string;
  notes: string;
};

const emptyForm: BankAccountForm = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  sortCode: "",
  swiftCode: "",
  iban: "",
  currency: "NGN",
  notes: "",
};

function formatDateTimeInput(date: string | Date) {
  return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
}

export function SettingsClient({
  bankAccounts: initialAccounts,
  admissionSettings: initialAdmission,
  applicationPeriods: initialPeriods,
}: Props) {
  const router = useRouter();
  const [schoolName, setSchoolName] = useState(
    initialAdmission?.schoolName ?? "Sankt Georg International School"
  );
  const [schoolEmail, setSchoolEmail] = useState(initialAdmission?.schoolEmail ?? "");
  const [schoolPhone, setSchoolPhone] = useState(initialAdmission?.schoolPhone ?? "");
  const [maintenanceMode, setMaintenanceMode] = useState(initialAdmission?.maintenanceMode ?? false);
  const [saving, setSaving] = useState(false);

  // Admission settings — note only
  const [academicSessionPickerOpen, setAcademicSessionPickerOpen] = useState(false);
  const [admissionNotes, setAdmissionNotes] = useState(initialAdmission?.notes ?? "");
  const [savingAdmission, setSavingAdmission] = useState(false);
  const [periods, setPeriods] = useState<ApplicationPeriod[]>(initialPeriods);
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<ApplicationPeriod | null>(null);
  const [editingPeriodPickerOpen, setEditingPeriodPickerOpen] = useState(false);
  const [updatingPeriod, setUpdatingPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    title: "",
    applicationStartDate: "",
    applicationEndDate: "",
    examStartDate: "",
    examEndDate: "",
    registrationFee: "",
    currency: "NGN",
  });
  const [editPeriodForm, setEditPeriodForm] = useState({
    title: "",
    applicationStartDate: "",
    applicationEndDate: "",
  });

  // Bank accounts state
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<BankAccountForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const selectedCreateAcademicSession = parseAcademicSession(periodForm.title);
  const selectedEditAcademicSession = parseAcademicSession(editPeriodForm.title);

  async function handleSave() {
    setSaving(true);
    const result = await updateSchoolSettings({
      schoolName,
      schoolEmail: schoolEmail || undefined,
      schoolPhone: schoolPhone || undefined,
      maintenanceMode,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Settings saved.");
    } else {
      toast.error((result as { error: string }).error);
    }
  }

  async function handleSaveAdmission() {
    setSavingAdmission(true);
    const result = await updateAdmissionSettings({
      notes: admissionNotes || undefined,
    });
    setSavingAdmission(false);
    if (result.success) {
      toast.success("Admission settings saved.");
    } else {
      toast.error((result as { error: string }).error);
    }
  }

  function setPeriodField(field: keyof typeof periodForm, value: string) {
    setPeriodForm((prev) => ({ ...prev, [field]: value }));
  }

  function setEditPeriodField(field: keyof typeof editPeriodForm, value: string) {
    setEditPeriodForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreatePeriod() {
    if (
      !periodForm.title.trim() ||
      !periodForm.applicationStartDate ||
      !periodForm.applicationEndDate ||
      !periodForm.examStartDate ||
      !periodForm.examEndDate ||
      !periodForm.registrationFee
    ) {
      toast.error("Pick academic session and fill in the dates and fee.");
      return;
    }

    setCreatingPeriod(true);
    const nextPeriod = {
      title: periodForm.title.trim(),
      applicationStartDate: periodForm.applicationStartDate,
      applicationEndDate: periodForm.applicationEndDate,
      examStartDate: periodForm.examStartDate,
      examEndDate: periodForm.examEndDate,
      registrationFee: Number(periodForm.registrationFee),
      currency: periodForm.currency.trim() || "NGN",
    };
    const result = await createApplicationPeriod({
      ...nextPeriod,
    });
    setCreatingPeriod(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setPeriods((prev) => [
      {
        id: result.data.periodId,
        title: nextPeriod.title,
        description: null,
        applicationStartDate: new Date(nextPeriod.applicationStartDate),
        applicationEndDate: new Date(nextPeriod.applicationEndDate),
        examStartDate: new Date(nextPeriod.examStartDate),
        examEndDate: new Date(nextPeriod.examEndDate),
        registrationFee: String(nextPeriod.registrationFee),
        currency: nextPeriod.currency,
        eligibleClasses: [],
        status: "upcoming",
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ...prev,
    ]);
    setPeriodForm({
      title: "",
      applicationStartDate: "",
      applicationEndDate: "",
      examStartDate: "",
      examEndDate: "",
      registrationFee: "",
      currency: "NGN",
    });
    setAcademicSessionPickerOpen(false);
    router.refresh();
    toast.success("Application session created.");
  }

  function openEditPeriod(period: ApplicationPeriod) {
    setEditingPeriod(period);
    setEditingPeriodPickerOpen(false);
    setEditPeriodForm({
      title: period.title,
      applicationStartDate: formatDateTimeInput(period.applicationStartDate),
      applicationEndDate: formatDateTimeInput(period.applicationEndDate),
    });
  }

  function closeEditPeriod() {
    setEditingPeriod(null);
    setEditingPeriodPickerOpen(false);
    setEditPeriodForm({
      title: "",
      applicationStartDate: "",
      applicationEndDate: "",
    });
  }

  async function handleUpdatePeriod() {
    if (!editingPeriod) return;
    if (
      !editPeriodForm.title.trim() ||
      !editPeriodForm.applicationStartDate ||
      !editPeriodForm.applicationEndDate
    ) {
      toast.error("Pick academic session and fill in the application dates.");
      return;
    }

    setUpdatingPeriod(true);
    const result = await updateApplicationPeriod({
      periodId: editingPeriod.id,
      title: editPeriodForm.title.trim(),
      applicationStartDate: editPeriodForm.applicationStartDate,
      applicationEndDate: editPeriodForm.applicationEndDate,
    });
    setUpdatingPeriod(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setPeriods((prev) =>
      prev.map((period) =>
        period.id === editingPeriod.id
          ? {
              ...period,
              title: editPeriodForm.title.trim(),
              applicationStartDate: new Date(editPeriodForm.applicationStartDate),
              applicationEndDate: new Date(editPeriodForm.applicationEndDate),
              updatedAt: new Date(),
            }
          : period
      )
    );
    closeEditPeriod();
    router.refresh();
    toast.success("Application session updated.");
  }

  async function handlePeriodStatus(periodId: string, status: "upcoming" | "open" | "closed" | "archived") {
    const result = await updateApplicationPeriodStatus(periodId, status);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setPeriods((prev) =>
      prev.map((period) => ({
        ...period,
        status: period.id === periodId ? status : status === "open" ? "closed" : period.status,
      }))
    );
    router.refresh();
    toast.success(`Session marked as ${status}.`);
  }

  function openCreate() {
    setEditingAccount(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(account: BankAccount) {
    setEditingAccount(account);
    setForm({
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      sortCode: account.sortCode ?? "",
      swiftCode: account.swiftCode ?? "",
      iban: account.iban ?? "",
      currency: account.currency,
      notes: account.notes ?? "",
    });
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
    setEditingAccount(null);
    setForm(emptyForm);
  }

  function setField(field: keyof BankAccountForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmitAccount() {
    if (!form.bankName.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
      toast.error("Bank name, account name, and account number are required.");
      return;
    }
    setSubmitting(true);

    const payload = {
      bankName: form.bankName.trim(),
      accountName: form.accountName.trim(),
      accountNumber: form.accountNumber.trim(),
      sortCode: form.sortCode.trim() || undefined,
      swiftCode: form.swiftCode.trim() || undefined,
      iban: form.iban.trim() || undefined,
      currency: form.currency.trim() || "NGN",
      notes: form.notes.trim() || undefined,
    };

    if (editingAccount) {
      const result = await updateBankAccount(editingAccount.id, payload);
      if (result.success) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === editingAccount.id
              ? {
                  ...a,
                  bankName: payload.bankName ?? a.bankName,
                  accountName: payload.accountName ?? a.accountName,
                  accountNumber: payload.accountNumber ?? a.accountNumber,
                  sortCode: payload.sortCode ?? null,
                  swiftCode: payload.swiftCode ?? null,
                  iban: payload.iban ?? null,
                  currency: payload.currency ?? a.currency,
                  notes: payload.notes ?? null,
                }
              : a
          )
        );
        toast.success("Bank account updated.");
        closeDialog();
      } else {
        toast.error((result as { error: string }).error);
      }
    } else {
      const result = await createBankAccount(payload);
      if (result.success && "data" in result) {
        // Reload will bring the new record; optimistic add with temp data
        setAccounts((prev) => [
          {
            id: (result.data as { id: string }).id,
            bankName: payload.bankName,
            accountName: payload.accountName,
            accountNumber: payload.accountNumber,
            sortCode: payload.sortCode ?? null,
            swiftCode: payload.swiftCode ?? null,
            iban: payload.iban ?? null,
            routingNumber: null,
            currency: payload.currency,
            notes: payload.notes ?? null,
            isActive: true,
            createdBy: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          ...prev,
        ]);
        toast.success("Bank account added.");
        closeDialog();
      } else {
        toast.error((result as { error: string }).error);
      }
    }
    setSubmitting(false);
  }

  async function handleToggle(account: BankAccount) {
    setTogglingId(account.id);
    const result = await toggleBankAccountActive(account.id, !account.isActive);
    setTogglingId(null);
    if (result.success) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, isActive: !a.isActive } : a
        )
      );
      toast.success(account.isActive ? "Account deactivated." : "Account activated.");
    } else {
      toast.error((result as { error: string }).error);
    }
  }

  async function handleDelete(account: BankAccount) {
    setDeletingId(account.id);
    const result = await deleteBankAccount(account.id);
    setDeletingId(null);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setAccountToDelete(null);
      toast.success("Bank account deleted.");
    } else {
      toast.error((result as { error: string }).error);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide configuration. Changes take effect immediately.
        </p>
      </div>

      {/* School info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base">School Information</CardTitle>
          <CardDescription className="text-xs">
            Displayed across the public website and emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="school-name">School Name</Label>
            <Input
              id="school-name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school-email">Contact Email</Label>
              <Input
                id="school-email"
                type="email"
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
                placeholder="admissions@school.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school-phone">Contact Phone</Label>
              <Input
                id="school-phone"
                type="tel"
                value={schoolPhone}
                onChange={(e) => setSchoolPhone(e.target.value)}
                placeholder="+234 …"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admission settings */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base">Admissions Message</CardTitle>
          <CardDescription className="text-xs">
            Public admissions status now follows the open application session below. Use this for optional website copy only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admission-notes">Custom Message (optional)</Label>
            <Textarea
              id="admission-notes"
              value={admissionNotes}
              onChange={(e) => setAdmissionNotes(e.target.value)}
              placeholder="Leave blank to use the default message based on open/closed status."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              If set, this replaces the auto-generated body text on the public admissions CTA.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAdmission}
              disabled={savingAdmission}
              size="sm"
              className="gap-1.5 font-medium"
            >
              {savingAdmission ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Admissions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Application sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base">Application Sessions</CardTitle>
          <CardDescription className="text-xs">
            One session can be open at a time. Frontend admissions state comes from the session marked open and still within its date window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="period-title">Academic session</Label>
              <Button
                id="period-title"
                type="button"
                variant="outline"
                className="w-full justify-start px-2.5 font-normal"
                onClick={() => setAcademicSessionPickerOpen((open) => !open)}
              >
                <CalendarIcon data-icon="inline-start" />
                {periodForm.title || "Pick academic session"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Pick session start year. We save it as &quot;2026/2027&quot; automatically.
              </p>
              {academicSessionPickerOpen && (
                <div className="rounded-xl border p-3">
                  <Calendar
                    mode="single"
                    selected={selectedCreateAcademicSession}
                    defaultMonth={selectedCreateAcademicSession ?? new Date()}
                    captionLayout="dropdown"
                    startMonth={new Date(2000, 0, 1)}
                    endMonth={new Date(2100, 11, 31)}
                    onSelect={(date) => {
                      if (!date) return;
                      setPeriodField("title", formatAcademicSession(date));
                      setAcademicSessionPickerOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="application-start">Application starts</Label>
              <Input
                id="application-start"
                type="datetime-local"
                value={periodForm.applicationStartDate}
                onChange={(event) => setPeriodField("applicationStartDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="application-end">Application ends</Label>
              <Input
                id="application-end"
                type="datetime-local"
                value={periodForm.applicationEndDate}
                onChange={(event) => setPeriodField("applicationEndDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-start">Exam starts</Label>
              <Input
                id="exam-start"
                type="datetime-local"
                value={periodForm.examStartDate}
                onChange={(event) => setPeriodField("examStartDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-end">Exam ends</Label>
              <Input
                id="exam-end"
                type="datetime-local"
                value={periodForm.examEndDate}
                onChange={(event) => setPeriodField("examEndDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registration-fee">Application fee</Label>
              <Input
                id="registration-fee"
                type="number"
                min="0"
                value={periodForm.registrationFee}
                onChange={(event) => setPeriodField("registrationFee", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-currency">Currency</Label>
              <Input
                id="period-currency"
                value={periodForm.currency}
                onChange={(event) => setPeriodField("currency", event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreatePeriod} disabled={creatingPeriod} className="gap-1.5">
              {creatingPeriod ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create Session
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            {periods.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No application sessions yet.
              </div>
            ) : (
              periods.map((period) => (
                <div key={period.id} className="rounded-lg border bg-card px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{period.title}</p>
                        <Badge variant="outline" className="capitalize">{period.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(period.applicationStartDate)} to {formatDate(period.applicationEndDate)} · {formatCurrency(Number(period.registrationFee), period.currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditPeriod(period)}>
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      {period.status !== "open" && (
                        <Button size="sm" variant="outline" onClick={() => handlePeriodStatus(period.id, "open")}>
                          Open
                        </Button>
                      )}
                      {period.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => handlePeriodStatus(period.id, "closed")}>
                          Close
                        </Button>
                      )}
                      {period.status !== "archived" && (
                        <Button size="sm" variant="ghost" onClick={() => handlePeriodStatus(period.id, "archived")}>
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature flags */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base">Feature Flags</CardTitle>
          <CardDescription className="text-xs">Enable or disable platform features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">
                Show a maintenance page to all visitors. Admins can still log in.
              </p>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>
        </CardContent>
      </Card>

      {/* ponytail: payment management removed from product; keep legacy CRUD hidden until data model is deleted */}
      {false && (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-base flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Bank Accounts for Manual Payment
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Add the bank accounts students should transfer fees to.
                Active accounts are displayed on the entrance exam payment screen.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground rounded-lg border border-dashed border-border">
              No bank accounts added yet. Click <strong>Add Account</strong> to get started.
            </div>
          )}
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`rounded-lg border px-4 py-3 flex items-start justify-between gap-3 transition-colors ${
                account.isActive
                  ? "border-border bg-card"
                  : "border-border/40 bg-muted/20 opacity-60"
              }`}
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{account.bankName}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      account.isActive
                        ? "border-success/40 text-success"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {account.accountName} · {account.accountNumber}
                </p>
                {(account.sortCode || account.swiftCode || account.iban) && (
                  <p className="text-xs text-muted-foreground">
                    {account.sortCode && `Sort: ${account.sortCode}`}
                    {account.swiftCode && ` · SWIFT: ${account.swiftCode}`}
                    {account.iban && ` · IBAN: ${account.iban}`}
                  </p>
                )}
                {account.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{account.notes}</p>
                )}
                <p className="text-xs text-muted-foreground/60">{account.currency}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleToggle(account)}
                  disabled={togglingId === account.id}
                  title={account.isActive ? "Deactivate" : "Activate"}
                >
                  {togglingId === account.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : account.isActive ? (
                    <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Power className="h-3.5 w-3.5 text-success" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => openEdit(account)}
                  title="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setAccountToDelete(account)}
                  disabled={deletingId === account.id}
                  title="Delete"
                >
                  {deletingId === account.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      )}

      {/* Save settings */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5 font-medium shadow-brand-sm"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Settings
        </Button>
      </div>

      <Dialog open={!!editingPeriod} onOpenChange={(open) => !open && closeEditPeriod()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Application Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-period-title">Academic session</Label>
              <Button
                id="edit-period-title"
                type="button"
                variant="outline"
                className="w-full justify-start px-2.5 font-normal"
                onClick={() => setEditingPeriodPickerOpen((open) => !open)}
              >
                <CalendarIcon data-icon="inline-start" />
                {editPeriodForm.title || "Pick academic session"}
              </Button>
              {editingPeriodPickerOpen && (
                <div className="rounded-xl border p-3">
                  <Calendar
                    mode="single"
                    selected={selectedEditAcademicSession}
                    defaultMonth={selectedEditAcademicSession ?? new Date()}
                    captionLayout="dropdown"
                    startMonth={new Date(2000, 0, 1)}
                    endMonth={new Date(2100, 11, 31)}
                    onSelect={(date) => {
                      if (!date) return;
                      setEditPeriodField("title", formatAcademicSession(date));
                      setEditingPeriodPickerOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-application-start">Application starts</Label>
                <Input
                  id="edit-application-start"
                  type="datetime-local"
                  value={editPeriodForm.applicationStartDate}
                  onChange={(event) => setEditPeriodField("applicationStartDate", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-application-end">Application ends</Label>
                <Input
                  id="edit-application-end"
                  type="datetime-local"
                  value={editPeriodForm.applicationEndDate}
                  onChange={(event) => setEditPeriodField("applicationEndDate", event.target.value)}
                />
              </div>
            </div>
            {editingPeriod && (
              <p className="text-xs text-muted-foreground">
                Exam dates, fee, and eligible classes stay as created for this flow.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditPeriod} disabled={updatingPeriod}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button onClick={handleUpdatePeriod} disabled={updatingPeriod} className="gap-1.5">
              {updatingPeriod ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bank account?</AlertDialogTitle>
            <AlertDialogDescription>
              {accountToDelete
                ? `Delete "${accountToDelete.bankName} - ${accountToDelete.accountNumber}"? This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === accountToDelete?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => accountToDelete && handleDelete(accountToDelete)}
              disabled={deletingId === accountToDelete?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingId === accountToDelete?.id ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit Bank Account Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Bank Name *</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                  placeholder="e.g. First Bank Nigeria"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Account Name *</Label>
                <Input
                  value={form.accountName}
                  onChange={(e) => setField("accountName", e.target.value)}
                  placeholder="e.g. Sankt Georg International School"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Account Number *</Label>
                <Input
                  value={form.accountNumber}
                  onChange={(e) => setField("accountNumber", e.target.value)}
                  placeholder="e.g. 0123456789"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                  placeholder="NGN"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Code</Label>
                <Input
                  value={form.sortCode}
                  onChange={(e) => setField("sortCode", e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SWIFT / BIC</Label>
                <Input
                  value={form.swiftCode}
                  onChange={(e) => setField("swiftCode", e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>IBAN</Label>
                <Input
                  value={form.iban}
                  onChange={(e) => setField("iban", e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Instructions / Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Any additional transfer instructions shown to students…"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button onClick={handleSubmitAccount} disabled={submitting} className="gap-1.5">
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {editingAccount ? "Save Changes" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
