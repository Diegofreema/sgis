"use client";

import { useTransition } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resendVerification } from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";

type Props = {
  email: string;
};

export function ResendVerificationForm({ email }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await resendVerification(email);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Verification email sent again.");
        });
      }}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending…
        </>
      ) : (
        <>
          <Mail className="h-4 w-4" />
          Resend verification email
        </>
      )}
    </Button>
  );
}
