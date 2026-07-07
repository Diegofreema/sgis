import { getRouteApi } from "@tanstack/react-router";
import Link from "@/lib/compat/link";
import { MailCheck, ShieldCheck } from "lucide-react";
import { ResendVerificationForm } from "@/components/forms/ResendVerificationForm";
import { Button } from "@/components/ui/button";

const routeApi = getRouteApi("/account/verify-email");

export function VerifyEmailPage() {
  const { email } = routeApi.useSearch();

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

      <Button asChild variant="ghost" className="w-full text-muted-foreground">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
