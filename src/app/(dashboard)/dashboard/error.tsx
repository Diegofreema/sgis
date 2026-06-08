"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Dashboard error boundary.
 * Catches uncaught errors from any dashboard page or segment.
 * Must be a Client Component (Next.js constraint for error.tsx).
 */
export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="font-serif text-xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          We encountered an unexpected error. Please try again or contact support
          if the problem persists.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Try Again
        </Button>
        <Button variant="ghost" onClick={() => window.location.href = "/dashboard"}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
