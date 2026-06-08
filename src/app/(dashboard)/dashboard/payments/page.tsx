import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { resolveManagedProfileContext } from "@/lib/managed-profile";
import { getPaymentsByUser } from "@/server/queries/payments.queries";
import { getActiveBankAccounts } from "@/server/queries/bank-accounts.queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS, PAYMENT_PURPOSE_LABELS } from "@/constants/payment";
import { FadeIn } from "@/components/animations/FadeIn";
import { PaymentProofClient } from "./PaymentProofClient";
import { CreditCard, Landmark, Copy, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";

function statusColor(status: string): string {
  if (status === "approved") return "bg-success/15 text-success border-success/30";
  if (status === "rejected") return "bg-destructive/15 text-destructive border-destructive/30";
  if (status === "submitted") return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "rejected") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "submitted") return <Clock className="h-3.5 w-3.5" />;
  return <AlertCircle className="h-3.5 w-3.5" />;
}

type Props = {
  searchParams: Promise<{ student?: string }>;
};

export default async function PaymentsPage({ searchParams }: Props) {
  await requireAuth();
  const { student } = await searchParams;
  const context = await resolveManagedProfileContext(student);

  if (context.target.role === "parent" && !context.isManagingStudent) {
    return (
      <div className="space-y-8 max-w-3xl">
        <FadeIn>
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center space-y-4">
            <CreditCard className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <h1 className="font-serif text-2xl font-semibold text-foreground">Choose a student first</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Parent accounts manage payment records on behalf of linked students.
              </p>
            </div>
            <Button asChild className="gap-1.5">
              <Link href="/dashboard/students">
                Open My Students <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    );
  }

  const [userPayments, bankAccounts] = await Promise.all([
    getPaymentsByUser(context.target.id),
    getActiveBankAccounts(),
  ]);

  // Payment that needs proof (pending or rejected)
  const actionablePayment = userPayments.find(
    (p) => p.status === "pending" || p.status === "rejected"
  ) ?? null;

  return (
    <div className="space-y-8 max-w-3xl">
      {context.isManagingStudent && (
        <FadeIn>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Managing payments for {context.target.firstName ?? "student"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Submit transfer proof here on behalf of your linked student.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard/students">
                Back to Students <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      )}

      <FadeIn>
        <h1 className="font-serif text-h3 font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pay your fees via bank transfer and submit proof here for verification.
        </p>
      </FadeIn>

      {/* ── Bank Account Details ─────────────────────────────────────────────── */}
      <FadeIn>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base flex items-center gap-2 text-primary">
              <Landmark className="h-4 w-4" />
              Bank Transfer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bankAccounts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Payment details are not yet configured. Please contact the admissions
                office directly.
              </div>
            ) : (
              <div className="space-y-4">
                {bankAccounts.map((account, idx) => (
                  <div key={account.id}>
                    {idx > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        {account.bankName}
                        {account.currency !== "NGN" && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({account.currency})
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Account Name</span>
                          <p className="font-medium mt-0.5">{account.accountName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Account Number</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="font-mono font-semibold text-foreground">
                              {account.accountNumber}
                            </p>
                            <CopyButton text={account.accountNumber} />
                          </div>
                        </div>
                        {account.sortCode && (
                          <div>
                            <span className="text-muted-foreground text-xs">Sort Code</span>
                            <p className="font-mono font-medium mt-0.5">{account.sortCode}</p>
                          </div>
                        )}
                        {account.swiftCode && (
                          <div>
                            <span className="text-muted-foreground text-xs">SWIFT / BIC</span>
                            <p className="font-mono font-medium mt-0.5">{account.swiftCode}</p>
                          </div>
                        )}
                        {account.iban && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground text-xs">IBAN</span>
                            <p className="font-mono font-medium mt-0.5">{account.iban}</p>
                          </div>
                        )}
                      </div>
                      {account.notes && (
                        <div className="mt-2 rounded-lg bg-background border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                          {account.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-4 rounded-lg bg-background border border-border/60 px-3 py-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How to pay:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Transfer the exact fee amount to the account above using your bank app.</li>
                    <li>Note your transaction / receipt reference number.</li>
                    <li>Return to this page and click <strong>Submit Proof of Payment</strong>.</li>
                    <li>The admissions team will verify and confirm within 1–2 business days.</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* ── Proof Submission (for actionable payment) ────────────────────────── */}
      {actionablePayment && (
        <FadeIn>
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {PAYMENT_PURPOSE_LABELS[actionablePayment.purpose as keyof typeof PAYMENT_PURPOSE_LABELS]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Amount:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(Number(actionablePayment.amount), actionablePayment.currency)}
                  </span>
                  {" · "}Ref: <span className="font-mono">{actionablePayment.reference}</span>
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-xs border gap-1 ${statusColor(actionablePayment.status)}`}
              >
                <StatusIcon status={actionablePayment.status} />
                {PAYMENT_STATUS_LABELS[actionablePayment.status as keyof typeof PAYMENT_STATUS_LABELS]}
              </Badge>
            </div>

            <Separator className="my-3" />

            <PaymentProofClient
              payment={actionablePayment}
              userId={context.target.id}
              targetStudentProfileId={context.isManagingStudent ? context.target.id : undefined}
            />
          </div>
        </FadeIn>
      )}

      {/* ── Payment History ──────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Payment History</h2>
          {userPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center rounded-xl border border-dashed border-border">
              <CreditCard className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No payment records yet.</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Once you submit your application for review, a payment record will
                appear here.
              </p>
            </div>
          ) : (
            userPayments.map((payment) => (
              <Card key={payment.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {PAYMENT_PURPOSE_LABELS[payment.purpose as keyof typeof PAYMENT_PURPOSE_LABELS]}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Ref: {payment.reference}
                      </p>
                      {payment.transactionRef && (
                        <p className="text-xs text-muted-foreground">
                          Bank ref:{" "}
                          <span className="font-mono font-medium text-foreground">
                            {payment.transactionRef}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.createdAt.toISOString())}
                      </p>
                      {payment.adminNote && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Admin: &ldquo;{payment.adminNote}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(Number(payment.amount), payment.currency)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] border gap-1 ${statusColor(payment.status)}`}
                      >
                        <StatusIcon status={payment.status} />
                        {PAYMENT_STATUS_LABELS[payment.status as keyof typeof PAYMENT_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </FadeIn>
    </div>
  );
}

// ── Copy button helper ─────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      title="Copy to clipboard"
      className="text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {});
      }}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}
