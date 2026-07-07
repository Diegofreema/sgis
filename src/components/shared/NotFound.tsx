import Link from "@/lib/compat/link";
import Image from "@/lib/compat/image";
import { Button } from "@/components/ui/button";
import { Home, Shield } from "lucide-react";

/** Equivalent to legacy app/not-found.tsx. */
export function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="flex flex-col items-center gap-8 max-w-md">
        <Link href="/">
          <Image
            src="/logo.jpeg"
            alt="Sankt Georg International School"
            width={56}
            height={56}
            className="rounded-xl shadow-sm"
          />
        </Link>

        <div className="space-y-2">
          <p className="font-mono text-8xl font-bold text-primary/20 leading-none select-none">
            404
          </p>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
