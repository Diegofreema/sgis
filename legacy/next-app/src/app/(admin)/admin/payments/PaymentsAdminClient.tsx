"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { approvePayment, rejectPayment } from "@/server/actions/payment.actions";
import { PAYMENT_STATUS_LABELS, PAYMENT_PURPOSE_LABELS } from "@/constants/payment";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/db/schema/payments";

type Props = { payments: Payment[] };

function statusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  if (status === "submitted") return "secondary";
  return "outline";
}

function statusColor(status: string): string {
  if (status === "approved") return "bg-success/15 text-success border-success/30";
  if (status === "rejected") return "bg-destructive/15 text-destructive border-destructive/30";
  if (status === "submitted") return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

export function PaymentsAdminClient({ payments: initialPayments }: Props) {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogPayment, setDialogPayment] = useState<Payment | null>(null);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(q) ||
      p.purpose.toLowerCase().includes(q) ||
      (p.transactionRef ?? "").toLowerCase().includes(q)
    );
  });

  function openDialog(payment: Payment, action: "approve" | "reject") {
    setDialogPayment(payment);
    setDialogAction(action);
    setAdminNote("");
  }

  function closeDialog() {
    setDialogPayment(null);
    setDialogAction(null);
    setAdminNote("");
  }

  async function handleAction() {
    if (!dialogPayment || !dialogAction) return;
    setProcessing(true);
    const fn = dialogAction === "approve" ? approvePayment : rejectPayment;
    const result = await fn(dialogPayment.id, adminNote || undefined);
    setProcessing(false);

    if (result.success) {
      toast.success(
        dialogAction === "approve" ? "Payment approved!" : "Payment rejected."
      );
      setPayments((prev) =>
        prev.map((p) =>
          p.id === dialogPayment.id
            ? { ...p, status: dialogAction === "approve" ? "approved" : "rejected", adminNote: adminNote || null }
            : p
        )
      );
      closeDialog();
    } else {
      toast.error((result as { error: string }).error ?? "Action failed.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by reference or transaction ref…"
          className="pl-9 h-8 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        {(["submitted", "approved", "rejected", "pending"] as const).map((s) => (
          <div
            key={s}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${statusColor(s)}`}
          >
            {payments.filter((p) => p.status === s).length}{" "}
            {PAYMENT_STATUS_LABELS[s]}
          </div>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No payment records found.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((p) => {
                const expanded = expandedId === p.id;
                return (
                  <div key={p.id} className="transition-colors hover:bg-muted/20">
                    {/* Main row */}
                    <div
                      className="flex items-center justify-between px-5 py-4 gap-4 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium font-mono text-foreground">
                            {p.reference}
                          </p>
                          <Badge
                            className={`text-[10px] border ${statusColor(p.status)}`}
                            variant="outline"
                          >
                            {PAYMENT_STATUS_LABELS[p.status as keyof typeof PAYMENT_STATUS_LABELS]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {PAYMENT_PURPOSE_LABELS[p.purpose as keyof typeof PAYMENT_PURPOSE_LABELS]}
                          {" · "}
                          {formatDate(p.createdAt.toISOString())}
                        </p>
                        {p.transactionRef && (
                          <p className="text-xs text-muted-foreground">
                            Bank ref: <span className="font-mono font-medium text-foreground">{p.transactionRef}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(p.amount), p.currency)}
                        </p>
                        {/* Approve / reject buttons for submitted payments */}
                        {p.status === "submitted" && (
                          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1"
                              onClick={() => openDialog(p, "approve")}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => openDialog(p, "reject")}
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded proof details */}
                    {expanded && (
                      <div className="px-5 pb-4 border-t border-border/60 bg-muted/10">
                        <div className="pt-3 space-y-3 max-w-2xl">
                          {p.proofNote && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                User Note
                              </p>
                              <p className="text-sm text-foreground bg-background rounded-lg border border-border px-3 py-2">
                                {p.proofNote}
                              </p>
                            </div>
                          )}
                          {p.proofOfPaymentUrl && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Receipt / Proof
                              </p>
                              <div className="flex items-center gap-2">
                                <a
                                  href={p.proofOfPaymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View receipt
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              {/* Image preview if it looks like an image URL */}
                              {/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(p.proofOfPaymentUrl) && (
                                <img
                                  src={p.proofOfPaymentUrl}
                                  alt="Payment receipt"
                                  className="mt-2 rounded-lg border border-border max-h-64 object-contain"
                                />
                              )}
                            </div>
                          )}
                          {p.adminNote && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Admin Note
                              </p>
                              <p className="text-sm text-foreground bg-background rounded-lg border border-border px-3 py-2">
                                {p.adminNote}
                              </p>
                            </div>
                          )}
                          {p.paidAt && (
                            <p className="text-xs text-muted-foreground">
                              Approved on {formatDate(p.paidAt.toISOString())}
                            </p>
                          )}
                          {!p.proofNote && !p.proofOfPaymentUrl && !p.transactionRef && (
                            <p className="text-xs text-muted-foreground italic">
                              No proof details submitted yet.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject dialog */}
      <Dialog open={!!dialogPayment} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {dialogAction === "approve" ? "Approve Payment" : "Reject Payment"}
            </DialogTitle>
          </DialogHeader>
          {dialogPayment && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Reference: </span>
                  <span className="font-mono font-medium">{dialogPayment.reference}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-semibold">
                    {formatCurrency(Number(dialogPayment.amount), dialogPayment.currency)}
                  </span>
                </p>
                {dialogPayment.transactionRef && (
                  <p>
                    <span className="text-muted-foreground">Bank ref: </span>
                    <span className="font-mono">{dialogPayment.transactionRef}</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Admin Note{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    (optional — shown to the user)
                  </span>
                </Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    dialogAction === "approve"
                      ? "Payment confirmed. Thank you!"
                      : "The reference provided does not match our records. Please re-submit."
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={dialogAction === "reject" ? "destructive" : "default"}
              className="gap-1.5"
            >
              {processing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : dialogAction === "approve" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {dialogAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
