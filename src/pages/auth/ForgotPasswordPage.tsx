import { useState } from "react";
import Link from "@/lib/compat/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { isSubmitting } = form.formState;

  async function onSubmit({ email }: { email: string }) {
    const result = await resetPassword(email);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We've sent a password reset link to your email address. It expires in 15 minutes.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold text-foreground">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full font-medium" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </Form>

      <Button asChild variant="ghost" className="w-full gap-2 text-muted-foreground">
        <Link href="/login">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      </Button>
    </div>
  );
}
