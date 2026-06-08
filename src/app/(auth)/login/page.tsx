import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/forms/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Sankt Georg student portal.",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your student portal
        </p>
      </div>

      <LoginForm />

      <div className="text-center text-sm space-y-2">
        <p>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot your password?
          </Link>
        </p>
        <p className="text-muted-foreground">
          New to Sankt Georg?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
