import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { ErrorComponentProps } from "@tanstack/react-router";

/** Admin error boundary (legacy app/(admin)/admin/error.tsx). */
export function AdminError({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="font-serif text-xl font-semibold text-foreground">Admin Error</h2>
        <p className="text-sm text-muted-foreground">
          An error occurred while loading this admin page. You can try refreshing
          or navigating back to the overview.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Retry
        </Button>
        <Button variant="ghost" onClick={() => (window.location.href = "/admin")}>
          Admin Overview
        </Button>
      </div>
    </div>
  );
}
