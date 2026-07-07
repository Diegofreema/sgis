import { useEffect, useState, useTransition } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import {
  APPLICATION_DOCUMENT_MAX_SIZE_LABEL,
  APPLICATION_SUPPORTING_DOCUMENTS,
} from "@/lib/application-documents";
import { submitApplication, examAccessRequest, examAccessVerify } from "@/lib/edge";
import { BrandLogo } from "@/components/shared/brand-logo";

/** Session token minted by exam-access-verify; consumed by the exam page. */
export const EXAM_TOKEN_KEY = "sgis_public_exam_token";

export function PublicApplicationForm() {
  const [pending, startTransition] = useTransition();
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitApplication(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setCreatedCode(result.data.applicationCode);
      setCopied(false);
      toast.success("Application submitted. Check your email for your application ID.");
    });
  }

  async function copyApplicationCode() {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      toast.success("Application ID copied.");
    } catch {
      toast.error("Could not copy the application ID.");
    }
  }

  if (createdCode) {
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
          Keep this application ID safe and use it to track your status.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="rounded-md bg-background px-3 py-2 font-mono text-lg font-semibold">{createdCode}</p>
          <Button type="button" variant="outline" className="gap-2" onClick={copyApplicationCode}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy application ID"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Required documents</p>
          <p className="text-xs text-muted-foreground">
            Upload each file as JPG, PNG, WebP, or PDF. Maximum {APPLICATION_DOCUMENT_MAX_SIZE_LABEL} each.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {APPLICATION_SUPPORTING_DOCUMENTS.map((document) => (
            <div key={document.key} className="space-y-2">
              <Label htmlFor={document.key}>{document.label}</Label>
              <Input id={document.key} name={document.key} type="file" accept={document.accept} required />
              <p className="text-xs text-muted-foreground">
                {document.allowPdf ? "JPG, PNG, WebP, or PDF." : "JPG, PNG, or WebP image."} Maximum{" "}
                {APPLICATION_DOCUMENT_MAX_SIZE_LABEL}.
              </p>
            </div>
          ))}
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
  const navigate = useNavigate();
  const [applicationId, setApplicationId] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    navigate({
      to: "/entrance-exam",
      search: { applicationId: applicationId.trim().toUpperCase() },
      hash: "status",
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
        />
        <Button type="submit" className="gap-2">
          <Search className="h-4 w-4" />
          Track
        </Button>
      </form>
    </div>
  );
}

type SessionOption = { id: string; title: string };

export function PublicExamSessionPicker({
  sessions,
  selectedSessionId,
  currentApplicationId,
}: {
  sessions: SessionOption[];
  selectedSessionId: string;
  currentApplicationId?: string;
}) {
  const navigate = useNavigate();

  function handleChange(nextSessionId: string) {
    navigate({
      to: "/entrance-exam",
      search: { session: nextSessionId, ...(currentApplicationId ? { applicationId: currentApplicationId } : {}) },
      hash: "exam-access",
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
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function PublicExamVerificationCard({
  periodId,
  defaultApplicationCode = "",
}: {
  periodId: string;
  defaultApplicationCode?: string;
}) {
  const navigate = useNavigate();
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"request" | "verify">("request");
  const [applicationCode, setApplicationCode] = useState(defaultApplicationCode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [accessSessionId, setAccessSessionId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setApplicationCode(defaultApplicationCode);
  }, [defaultApplicationCode]);

  function request() {
    setActionError(null);
    startTransition(async () => {
      const result = await examAccessRequest({ periodId, applicationCode, email });
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

  function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    request();
  }

  function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!accessSessionId) return;
    setActionError(null);
    startTransition(async () => {
      const result = await examAccessVerify({ accessSessionId, code });
      if (!result.success) {
        setActionError(result.error);
        return;
      }
      window.sessionStorage.setItem(EXAM_TOKEN_KEY, result.data.token);
      toast.success("Email verified.");
      navigate({ to: "/entrance-exam/exam/start" });
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
              placeholder="SGISAPP..."
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
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              disabled={pending}
            />
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Code expires at {new Date(expiresAt).toLocaleTimeString()}.
              </p>
            )}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Continue
          </Button>
          <Button type="button" variant="outline" className="w-full gap-2" onClick={request} disabled={pending}>
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 print:hidden"
      onClick={() => window.print()}
    >
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
