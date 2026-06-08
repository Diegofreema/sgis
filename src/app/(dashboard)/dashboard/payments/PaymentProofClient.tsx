"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  Send,
  FileImage,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitPaymentProof } from "@/server/actions/payment.actions";
import { uploadDocument } from "@/lib/storage";
import type { Payment } from "@/db/schema/payments";

type Props = {
  payment: Payment;
  userId: string;
  targetStudentProfileId?: string;
};

export function PaymentProofClient({ payment, userId, targetStudentProfileId }: Props) {
  const [transactionRef, setTransactionRef] = useState(payment.transactionRef ?? "");
  const [proofNote, setProofNote] = useState(payment.proofNote ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(payment.status === "submitted");
  const fileRef = useRef<HTMLInputElement>(null);

  if (payment.status === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3.5">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-success">Payment Approved</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your payment has been verified and approved by the admissions team.
            {payment.adminNote && (
              <span className="block mt-1 italic">&ldquo;{payment.adminNote}&rdquo;</span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (payment.status === "rejected") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Proof Rejected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your proof of payment was rejected. Please re-submit with the correct details.
              {payment.adminNote && (
                <span className="block mt-1 font-medium text-foreground">
                  Reason: {payment.adminNote}
                </span>
              )}
            </p>
          </div>
        </div>
        {/* Allow re-submission */}
        <ProofForm
          payment={payment}
          userId={userId}
          transactionRef={transactionRef}
          proofNote={proofNote}
          file={file}
          uploading={uploading}
          submitting={submitting}
          submitted={submitted}
          setTransactionRef={setTransactionRef}
          setProofNote={setProofNote}
          setFile={setFile}
          setUploading={setUploading}
          setSubmitting={setSubmitting}
          setSubmitted={setSubmitted}
          fileRef={fileRef}
          targetStudentProfileId={targetStudentProfileId}
          isResubmit
        />
      </div>
    );
  }

  if (submitted || payment.status === "submitted") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">Proof Submitted</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your proof of payment is under review. The admissions team will approve or
            respond within 1–2 business days.
            {payment.transactionRef && (
              <span className="block mt-1">
                Transaction ref:{" "}
                <span className="font-mono font-medium text-foreground">
                  {payment.transactionRef}
                </span>
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProofForm
      payment={payment}
      userId={userId}
      transactionRef={transactionRef}
      proofNote={proofNote}
      file={file}
      uploading={uploading}
      submitting={submitting}
      submitted={submitted}
      setTransactionRef={setTransactionRef}
      setProofNote={setProofNote}
      setFile={setFile}
      setUploading={setUploading}
      setSubmitting={setSubmitting}
      setSubmitted={setSubmitted}
      fileRef={fileRef}
      targetStudentProfileId={targetStudentProfileId}
    />
  );
}

// ── Internal form component ──────────────────────────────────────────────────

type FormProps = {
  payment: Payment;
  userId: string;
  transactionRef: string;
  proofNote: string;
  file: File | null;
  uploading: boolean;
  submitting: boolean;
  submitted: boolean;
  setTransactionRef: (v: string) => void;
  setProofNote: (v: string) => void;
  setFile: (v: File | null) => void;
  setUploading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setSubmitted: (v: boolean) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  targetStudentProfileId?: string;
  isResubmit?: boolean;
};

function ProofForm({
  payment,
  userId,
  transactionRef,
  proofNote,
  file,
  uploading,
  submitting,
  setTransactionRef,
  setProofNote,
  setFile,
  setUploading,
  setSubmitting,
  setSubmitted,
  fileRef,
  targetStudentProfileId,
  isResubmit = false,
}: FormProps) {
  async function handleSubmit() {
    if (!transactionRef.trim() && !proofNote.trim() && !file) {
      toast.error("Please provide at least a transaction reference, note, or receipt image.");
      return;
    }

    setSubmitting(true);
    let proofUrl: string | undefined;

    // Upload the file first if one was selected
    if (file) {
      setUploading(true);
      try {
        const { url } = await uploadDocument(userId, payment.id, file);
        proofUrl = url;
      } catch {
        toast.error("Failed to upload receipt. Please try again.");
        setUploading(false);
        setSubmitting(false);
        return;
      }
      setUploading(false);
    }

    const result = await submitPaymentProof({
      paymentId: payment.id,
      transactionRef: transactionRef.trim() || undefined,
      proofNote: proofNote.trim() || undefined,
      proofOfPaymentUrl: proofUrl,
      targetStudentProfileId,
    });

    setSubmitting(false);
    if (result.success) {
      toast.success("Proof submitted! We'll review and confirm within 1–2 business days.");
      setSubmitted(true);
    } else {
      toast.error((result as { error: string }).error ?? "Submission failed.");
    }
  }

  return (
    <Card className={isResubmit ? "border-0 shadow-none bg-transparent p-0 mt-3" : ""}>
      {!isResubmit && (
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-base">Submit Proof of Payment</CardTitle>
          <CardDescription className="text-xs">
            After completing your bank transfer, provide the details below so the
            admissions team can verify your payment.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={`space-y-4 ${isResubmit ? "px-0 pb-0" : ""}`}>
        <div className="space-y-1.5">
          <Label htmlFor="txRef">Bank Transaction / Receipt Reference</Label>
          <Input
            id="txRef"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. TXN2024012345 or session ID from your bank app"
          />
          <p className="text-[11px] text-muted-foreground">
            The reference number from your bank transfer confirmation.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proofNote">Additional Notes</Label>
          <Textarea
            id="proofNote"
            value={proofNote}
            onChange={(e) => setProofNote(e.target.value)}
            placeholder="e.g. Transferred on 27 May 2026 at 3:45 PM. Sender name: John Doe."
            rows={3}
          />
        </div>

        {/* Receipt upload */}
        <div className="space-y-1.5">
          <Label>Receipt Screenshot / Proof Image</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <FileImage className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Click to upload receipt (image or PDF)
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">Optional but speeds up verification.</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="w-full gap-1.5 font-medium shadow-brand-sm"
        >
          {submitting || uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {uploading ? "Uploading receipt…" : "Submitting…"}
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Submit Proof of Payment
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
