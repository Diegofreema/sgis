"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { updateAdmissionSettings } from "@/server/actions/settings.actions";
import type { BankAccount } from "@/db/schema/bank_accounts";
import type { AdmissionSettings } from "@/db/schema/settings";

type Props = {
  bankAccounts: BankAccount[];
  admissionSettings: AdmissionSettings | null;
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

export function SettingsClient({ bankAccounts: initialAccounts, admissionSettings: initialAdmission }: Props) {
  // School settings (placeholder — connect to DB settings table in future)
  const [schoolName, setSchoolName] = useState("Sankt Georg International School");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admission settings — wired to DB
  const [admissionsOpen, setAdmissionsOpen] = useState(initialAdmission?.isOpen ?? false);
  const [academicSession, setAcademicSession] = useState(initialAdmission?.academicSession ?? "");
  const [admissionNotes, setAdmissionNotes] = useState(initialAdmission?.notes ?? "");
  const [savingAdmission, setSavingAdmission] = useState(false);

  // Bank accounts state
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<BankAccountForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Settings saved.");
  }

  async function handleSaveAdmission() {
    setSavingAdmission(true);
    const result = await updateAdmissionSettings({
      isOpen: admissionsOpen,
      academicSession,
      notes: admissionNotes || undefined,
    });
    setSavingAdmission(false);
    if (result.success) {
      toast.success("Admission settings saved.");
    } else {
      toast.error((result as { error: string }).error);
    }
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
    if (!confirm(`Delete "${account.bankName} — ${account.accountNumber}"? This cannot be undone.`)) return;
    setDeletingId(account.id);
    const result = await deleteBankAccount(account.id);
    setDeletingId(null);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
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
          <CardTitle className="font-serif text-base">Admissions</CardTitle>
          <CardDescription className="text-xs">
            Control the admissions status shown on the public website. Changes are reflected immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Admissions Open</p>
              <p className="text-xs text-muted-foreground">
                When on, the public CTA shows "Apply Now" buttons and the current academic session.
              </p>
            </div>
            <Switch checked={admissionsOpen} onCheckedChange={setAdmissionsOpen} />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="academic-session">Academic Session</Label>
            <Input
              id="academic-session"
              value={academicSession}
              onChange={(e) => setAcademicSession(e.target.value)}
              placeholder="e.g. 2025–2026"
            />
            <p className="text-xs text-muted-foreground">
              Displayed as "Applications for the [session] academic year are now open."
            </p>
          </div>
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
              If set, this replaces the auto-generated body text on the CTA section.
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

      {/* Bank Accounts */}
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
                Active accounts are displayed on the student payments page.
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
                  onClick={() => handleDelete(account)}
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
