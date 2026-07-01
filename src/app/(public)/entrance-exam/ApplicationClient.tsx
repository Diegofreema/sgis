"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/config/site";
import { createPublicApplication } from "@/server/actions/application.actions";
import {
  requestPublicExamAccess,
  verifyPublicExamAccess,
} from "@/server/actions/exam.actions";
import { BrandLogo } from "@/components/shared/brand-logo";

type CreatedApplication = {
  applicationCode: string;
  emailDeliveryMode: "resend" | "outbox" | "failed";
};

export function PublicApplicationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createdApplication, setCreatedApplication] = useState<CreatedApplication | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPublicApplication(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCreatedApplication(result.data);
      setCopied(false);
      toast.success(
        result.data.emailDeliveryMode === "resend"
          ? "Application submitted. Check your email for your application ID."
          : "Application submitted. Keep your application ID safe."
      );
      router.refresh();
    });
  }

  async function copyApplicationCode() {
    if (!createdApplication) return;

    try {
      await navigator.clipboard.writeText(createdApplication.applicationCode);
      setCopied(true);
      toast.success("Application ID copied.");
    } catch {
      toast.error("Could not copy the application ID.");
    }
  }

  if (createdApplication) {
    const emailWasSent = createdApplication.emailDeliveryMode === "resend";

    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div>
            <p className="font-medium">{siteConfig.name}</p>
            <p className="text-xs text-muted-foreground">Admissions application received</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-medium">Welcome. Your application was submitted successfully.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {emailWasSent
            ? "We sent your application ID to your email. Keep it safe and use it to track your status."
            : "Keep this application ID safe and use it to track your status. We could not confirm email delivery just now."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="rounded-md bg-background px-3 py-2 font-mono text-lg font-semibold">
            {createdApplication.applicationCode}
          </p>
          <Button type="button" variant="outline" className="gap-2" onClick={copyApplicationCode}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy application ID"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="intendedClass" value="Common Entrance" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" required />
        <Field label="Date of birth" name="dateOfBirth" type="date" required />
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            name="gender"
            required
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <Field label="State" name="state" />
        <Field label="LGA" name="lga" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Home address</Label>
        <Textarea id="address" name="address" required rows={3} />
      </div>

      <Field label="Previous school" name="previousSchool" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Guardian name" name="guardianName" required />
        <Field label="Guardian phone" name="guardianPhone" type="tel" required />
        <Field label="Guardian email" name="guardianEmail" type="email" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="receipt">Payment receipt</Label>
          <Input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
          <p className="text-xs text-muted-foreground">Image or PDF receipt. Maximum 100KB.</p>
        </div>
      </div>

      <Button type="submit" className="w-full gap-2 font-medium shadow-brand-sm" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit application
      </Button>
    </form>
  );
}

export function ApplicationTracker() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [applicationId, setApplicationId] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      applicationId: applicationId.trim().toUpperCase(),
    });
    startTransition(() => {
      router.push(`/entrance-exam?${params.toString()}#status`);
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={applicationId}
          onChange={(event) => setApplicationId(event.target.value)}
          placeholder="Application ID"
          required
          disabled={pending}
        />
        <Button type="submit" className="gap-2" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {pending ? "Searching..." : "Track"}
        </Button>
      </form>

      {pending && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Searching for your application...
        </div>
      )}
    </div>
  );
}

type SessionOption = {
  id: string;
  title: string;
};

export function PublicExamSessionPicker({
  sessions,
  selectedSessionId,
}: {
  sessions: SessionOption[];
  selectedSessionId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function handleChange(nextSessionId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("session", nextSessionId);
    params.delete("examError");

    startTransition(() => {
      router.push(`/entrance-exam?${params.toString()}#exam-access`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="exam-session">Academic session</Label>
        <select
          id="exam-session"
          value={selectedSessionId}
          onChange={(event) => handleChange(event.target.value)}
          disabled={pending}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title}
            </option>
          ))}
        </select>
      </div>

      {pending && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Loading exam details...
        </div>
      )}
    </div>
  );
}

export function PublicExamVerificationCard({
  periodId,
  defaultApplicationCode = "",
  examError,
}: {
  periodId: string;
  defaultApplicationCode?: string;
  examError?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"request" | "verify">("request");
  const [applicationCode, setApplicationCode] = useState(defaultApplicationCode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [accessSessionId, setAccessSessionId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(examError ?? null);

  function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      const result = await requestPublicExamAccess({
        periodId,
        applicationCode,
        email,
      });

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setAccessSessionId(result.data.accessSessionId);
      setMaskedEmail(result.data.maskedEmail);
      setExpiresAt(result.data.expiresAt);
      setPhase("verify");
      setCode("");
      toast.success("Verification code sent.");
    });
  }

  function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!accessSessionId) return;
    setActionError(null);

    startTransition(async () => {
      const result = await verifyPublicExamAccess({
        accessSessionId,
        code,
      });

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      toast.success("Email verified.");
      router.push(result.data.redirectTo);
      router.refresh();
    });
  }

  function handleResend() {
    setActionError(null);

    startTransition(async () => {
      const result = await requestPublicExamAccess({
        periodId,
        applicationCode,
        email,
      });

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setAccessSessionId(result.data.accessSessionId);
      setMaskedEmail(result.data.maskedEmail);
      setExpiresAt(result.data.expiresAt);
      toast.success("A new code has been sent.");
    });
  }

  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {phase === "request" ? <Mail className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {phase === "request" ? "Verify exam access" : "Enter verification code"}
          </p>
          <p className="text-sm text-muted-foreground">
            {phase === "request"
              ? "Use your application ID and email to request a secure access code."
              : `We sent a 6-digit code to ${maskedEmail}.`}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {phase === "request" ? (
        <form onSubmit={handleRequest} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exam-application-id">Application ID</Label>
            <Input
              id="exam-application-id"
              value={applicationCode}
              onChange={(event) => setApplicationCode(event.target.value.toUpperCase())}
              placeholder="SGIS-APP..."
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-email">Email</Label>
            <Input
              id="exam-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={pending}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Request code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exam-code">Verification code</Label>
            <Input
              id="exam-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              required
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Code expires at {new Date(expiresAt).toLocaleTimeString()}.
            </p>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Continue
          </Button>
          <Button type="button" variant="outline" className="w-full gap-2" onClick={handleResend} disabled={pending}>
            <RefreshCw className="h-4 w-4" />
            Resend code
          </Button>
        </form>
      )}
    </div>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" className="gap-2 print:hidden" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
