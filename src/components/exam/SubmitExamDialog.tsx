"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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

type SubmitExamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
  answeredCount: number;
  totalCount: number;
};

export function SubmitExamDialog({
  open,
  onOpenChange,
  onConfirm,
  answeredCount,
  totalCount,
}: SubmitExamDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const unansweredCount = totalCount - answeredCount;

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setSubmitting(true);
    const submitted = await onConfirm();
    if (!submitted) setSubmitting(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-xl">
            Submit Examination?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-3">
              <p>Are you sure you want to submit? This action cannot be undone.</p>
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Questions answered</span>
                  <span className="font-semibold text-success">{answeredCount} / {totalCount}</span>
                </div>
                {unansweredCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unanswered</span>
                    <span className="font-semibold text-destructive">{unansweredCount}</span>
                  </div>
                )}
              </div>
              {unansweredCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning-foreground">
                    You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}.
                    Unanswered questions will receive zero marks.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Review Answers</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 font-medium"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
            ) : (
              "Submit Examination"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
