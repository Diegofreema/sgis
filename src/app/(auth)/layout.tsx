/**
 * Auth layout — login / register / forgot-password.
 *
 * Server-side guard: authenticated users are immediately redirected to
 * /dashboard (defense-in-depth on top of the edge middleware check).
 *
 * The dynamic auth check runs inside a <Suspense> boundary so the static
 * decorative panel renders instantly from the prerendered shell.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getCurrentProfile } from "@/lib/auth";
import { getPostAuthPath } from "@/lib/auth-routing";
import { CopyrightYear } from "@/components/shared/CopyrightYear";

/** Async guard — redirects logged-in users before rendering children. */
async function AuthGuard({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile) redirect(getPostAuthPath(profile));
  return <>{children}</>;
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left decorative panel — fully static, renders immediately */}
      <div className="hidden lg:flex flex-col bg-linear-to-br from-primary via-primary/90 to-primary/70 p-12 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif font-semibold text-white">Sankt Georg</p>
            <p className="text-[10px] text-white/70 uppercase tracking-wider">
              International School
            </p>
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center relative z-10 space-y-8">
          <blockquote className="space-y-4">
            <p className="font-serif text-3xl font-medium text-white leading-relaxed italic">
              &ldquo;Education is the most powerful weapon which you can use to
              change the world.&rdquo;
            </p>
            <footer className="text-white/70 text-sm">— Nelson Mandela</footer>
          </blockquote>

          <div className="flex gap-6">
            {[
              { value: "500+", label: "Students" },
              { value: "98%", label: "University Rate" },
              { value: "35+", label: "Years" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-serif text-2xl font-bold text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/50 text-xs relative z-10">
          ©{" "}
          <Suspense fallback="…">
            <CopyrightYear />
          </Suspense>{" "}
          {siteConfig.name}
        </p>
      </div>

      {/* Right: Form area — auth guard streams in */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif font-semibold text-sm">Sankt Georg</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              International School
            </p>
          </div>
        </Link>

        <div className="w-full max-w-sm">
          <Suspense fallback={null}>
            <AuthGuard>{children}</AuthGuard>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
