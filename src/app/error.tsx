"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-8 max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              An unexpected error occurred. Please try again or contact support
              if the problem persists.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={reset}>Try Again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
