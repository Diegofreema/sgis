"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
  Landmark,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createOrUpdateApplication,
} from "@/server/actions/application.actions";
import { createPaymentRecord } from "@/server/actions/payment.actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { UserProfile } from "@/types/auth";
import type { Application, ApplicationPeriod as DBPeriod } from "@/db/schema/applications";

const ELIGIBLE_CLASSES = [
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12",
];

const formSchema = z.object({
  intendedClass: z.string().min(1, "Please select intended class"),
  previousSchool: z.string().optional(),
  guardianName: z.string().min(2, "Guardian name is required"),
  guardianPhone: z.string().min(7, "Valid phone number required"),
  guardianEmail: z.string().email("Valid email required"),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    color: "bg-muted text-muted-foreground",
    icon: <FileText className="h-4 w-4" />,
  },
  pending_payment: {
    label: "Awaiting Payment",
    color: "bg-warning/20 text-warning",
    icon: <Landmark className="h-4 w-4" />,
  },
  submitted: {
    label: "Submitted",
    color: "bg-primary/10 text-primary",
    icon: <Clock className="h-4 w-4" />,
  },
  under_review: {
    label: "Under Review",
    color: "bg-primary/20 text-primary",
    icon: <Clock className="h-4 w-4" />,
  },
  approved: {
    label: "Approved",
    color: "bg-success/20 text-success",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-destructive/20 text-destructive",
    icon: <XCircle className="h-4 w-4" />,
  },
};

type Props = {
  profile: UserProfile;
  application: Application | null;
  period: DBPeriod | null;
  isManagingStudent: boolean;
};

export function ApplicationFormClient({
  profile,
  application,
  period,
  isManagingStudent,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const studentQuery = isManagingStudent ? `?student=${profile.id}` : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      intendedClass: application?.intendedClass ?? "",
      previousSchool: application?.previousSchool ?? profile.previousSchool ?? "",
      guardianName: application?.guardianName ?? profile.guardianName ?? "",
      guardianPhone: application?.guardianPhone ?? profile.guardianPhone ?? "",
      guardianEmail: application?.guardianEmail ?? profile.guardianEmail ?? "",
    },
  });

  const currentStatus = application?.status ?? null;
  const isLocked =
    currentStatus === "submitted" ||
    currentStatus === "under_review" ||
    currentStatus === "approved" ||
    currentStatus === "rejected";

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await createOrUpdateApplication({
      ...values,
      targetStudentProfileId: isManagingStudent ? profile.id : undefined,
    });
    setSubmitting(false);

    if (result.success) {
      toast.success("Application saved.");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to save application.");
    }
  }

  /**
   * Creates a payment record and directs the user to the Payments page
   * where they can see bank details and submit proof of transfer.
   */
  async function handleProceedToPayment() {
    if (!application || !period) return;
    setPaymentLoading(true);

    const result = await createPaymentRecord({
      purpose: "entrance_exam_registration",
      applicationId: application.id,
      amount: Number(period.registrationFee),
      currency: period.currency,
      targetStudentProfileId: isManagingStudent ? profile.id : undefined,
    });

    setPaymentLoading(false);

    if (result.success && "data" in result) {
      toast.success("Payment record created. Please complete your bank transfer.");
      router.push(`/dashboard/payments${studentQuery}`);
    } else {
      toast.error(
        (result as { error: string }).error ?? "Failed to create payment record."
      );
    }
  }

  if (profile.role === "parent" && !isManagingStudent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <h2 className="font-serif text-lg font-semibold">Choose a student first</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Parent accounts manage admission applications on behalf of linked students.
          </p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/dashboard/students">
            Open My Students <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  if (!period && !application) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center max-w-lg mx-auto">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h2 className="font-serif text-lg font-semibold">Applications Closed</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Entrance examination applications are not currently open. Check back later or
          contact the admissions office.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {isManagingStudent && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Managing application for {profile.firstName ?? "student"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You are working on this student’s admission steps from your parent dashboard.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/dashboard/students">
              Back to Students <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Period info */}
      {period && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base text-primary">
              {period.title}
            </CardTitle>
            <CardDescription className="text-xs">
              Application deadline:{" "}
              <span className="font-semibold text-foreground">
                {formatDate(period.applicationEndDate)}
              </span>{" "}
              · Registration fee:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(Number(period.registrationFee), period.currency)}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Status badge */}
      {currentStatus && (
        <div className="flex items-center gap-3">
          <Badge
            className={`gap-1.5 ${STATUS_CONFIG[currentStatus]?.color ?? ""}`}
          >
            {STATUS_CONFIG[currentStatus]?.icon}
            {STATUS_CONFIG[currentStatus]?.label}
          </Badge>
          {application?.submittedAt && (
            <span className="text-xs text-muted-foreground">
              Submitted {formatDate(application.submittedAt)}
            </span>
          )}
        </div>
      )}

      {/* Rejection reason */}
      {currentStatus === "rejected" && application?.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive mb-1">Application Rejected</p>
          <p className="text-sm text-muted-foreground">{application.rejectionReason}</p>
        </div>
      )}

      {/* Approved state */}
      {currentStatus === "approved" && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4">
          <p className="text-sm font-medium text-success mb-1">🎉 Application Approved!</p>
          <p className="text-sm text-muted-foreground">
            You have been approved to take the entrance examination. Visit the Exam page to
            start when the exam window opens.
          </p>
          <Button
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => router.push(`/dashboard/exam${studentQuery}`)}
          >
            {isManagingStudent ? "View Exam Status" : "Go to Exam"}
          </Button>
        </div>
      )}

      {/* Pending payment instructions */}
      {currentStatus === "pending_payment" && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-warning" />
            <p className="text-sm font-medium text-warning">Payment Required</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your application is saved. To complete your submission, please transfer the
            registration fee to our bank account and submit proof of payment on the
            Payments page.
          </p>
          {period && (
            <p className="text-sm font-semibold text-foreground">
              Amount due:{" "}
              {formatCurrency(Number(period.registrationFee), period.currency)}
            </p>
          )}
          <Button
            className="mt-1 gap-1.5 font-medium"
            onClick={() => router.push(`/dashboard/payments${studentQuery}`)}
          >
            <Landmark className="h-3.5 w-3.5" />
            Go to Payments
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Application form */}
      {!isLocked && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">Application Form</CardTitle>
                <CardDescription className="text-xs">
                  Fill in your details carefully. You can save and return later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="intendedClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intended Class / Year Group *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ELIGIBLE_CLASSES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="previousSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous School</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Name of previous school…" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg bg-muted/30 p-4 space-y-4">
                  <p className="text-sm font-medium">Guardian / Parent Information</p>
                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Guardian's full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guardianPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone *</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="+234 …" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardianEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="guardian@email.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="submit"
                variant="outline"
                disabled={submitting}
                className="gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Draft
              </Button>

              {currentStatus === "pending_payment" && period && (
                <Button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={paymentLoading}
                  className="gap-1.5 font-medium shadow-brand-sm"
                >
                  {paymentLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Landmark className="h-3.5 w-3.5" />
                  )}
                  Pay {formatCurrency(Number(period.registrationFee), period.currency)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
