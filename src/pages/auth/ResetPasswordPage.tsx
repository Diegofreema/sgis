import { useEffect, useState } from "react";
import Link from "@/lib/compat/link";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { PasswordUpdateForm } from "@/components/forms/PasswordUpdateForm";
import { Button } from "@/components/ui/button";

export function ResetPasswordPage() {
  // Supabase parses the recovery token from the URL hash on load and sets a
  // session; getUser then resolves the account behind the reset link.
  const [user, setUser] = useState<{ email?: string } | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => active && setUser(data.user ?? null));
    return () => {
      active = false;
    };
  }, []);

  if (user === undefined) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
        <div className="mt-4 h-10 rounded bg-muted animate-pulse" />
        <div className="mt-3 h-10 rounded bg-muted animate-pulse" />
        <div className="mt-4 h-10 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground">Reset link required</h1>
          <p className="text-sm text-muted-foreground">
            Open the password reset link from your email to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <p>
              If your link expired, request another reset email and return here from the latest message.
            </p>
          </div>
        </div>

        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold text-foreground">Create a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password from the recovery link we sent to your email.
        </p>
      </div>

      <PasswordUpdateForm
        heading="Reset your password"
        description={`Use a strong password for ${user.email ?? "your account"}.`}
        submitLabel="Save new password"
        successMessage="Password updated. Redirecting to your account…"
      />
    </div>
  );
}
