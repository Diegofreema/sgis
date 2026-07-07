import Link from "@/lib/compat/link";
import { LoginForm } from "@/components/forms/LoginForm";

export function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold text-foreground">Sign in</h1>
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
          Applying for entrance exam?{" "}
          <Link href="/entrance-exam" className="text-primary font-medium hover:underline">
            Use the application page
          </Link>
        </p>
      </div>
    </div>
  );
}
