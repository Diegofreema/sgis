import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, ShieldCheck } from "lucide-react";
import { ResendVerificationForm } from "@/components/forms/ResendVerificationForm";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your Sankt Georg account email address.",
};

type Props = {
  searchParams: Promise<{ email?: string }>;
};

async function VerifyEmailContent({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        We&apos;ve sent a confirmation link to{" "}
        <span className="font-medium text-foreground">{email ?? "your inbox"}</span>.
      </p>

      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Your admin account stays locked until the email address is confirmed. After verification,
            we’ll sign you in automatically and send you to the admin panel.
          </p>
        </div>

        {email ? (
          <ResendVerificationForm email={email} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Open the email address you used during registration to continue.
          </p>
        )}
      </div>
    </>
  );
}

function VerifyEmailFallback() {
  return (
    <>
      <div className="h-4 w-48 rounded bg-muted animate-pulse mx-auto" />
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="h-16 rounded bg-muted animate-pulse" />
        <div className="mt-4 h-10 rounded bg-muted animate-pulse" />
      </div>
    </>
  );
}

export default function VerifyEmailPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-serif text-2xl font-bold text-foreground">Verify your email</h1>
        </div>
      </div>

      <Suspense fallback={<VerifyEmailFallback />}>
        <VerifyEmailContent searchParams={searchParams} />
      </Suspense>

      <Button asChild variant="ghost" className="w-full text-muted-foreground">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
