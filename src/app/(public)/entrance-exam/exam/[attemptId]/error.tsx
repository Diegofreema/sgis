"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicExamError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h1 className="font-serif text-xl font-semibold text-foreground">
                Could not load exam
              </h1>
              <p className="text-sm text-muted-foreground">
                Something went wrong while opening this attempt.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => unstable_retry()}>Try again</Button>
              <Button asChild variant="outline">
                <Link href="/entrance-exam#exam-access">Back to exam access</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
