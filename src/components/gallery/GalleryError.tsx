import { useEffect } from "react";
import Link from "@/lib/compat/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorComponentProps } from "@tanstack/react-router";

/** Equivalent to legacy app/(public)/gallery/error.tsx. */
export function GalleryError({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    console.error("[GalleryError]", error);
  }, [error]);

  return (
    <div>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding text-center">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Campus Life</p>
          <h1 className="text-h1 font-serif font-bold text-foreground mb-4">Our Gallery</h1>
          <p className="text-xl text-muted-foreground">
            A visual tour of campus life, events, and learning at Sankt Georg.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Could not load gallery
            </h2>
            <p className="mt-3 text-muted-foreground">
              Something went wrong while fetching gallery images. Please try again.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => reset()}>Try Again</Button>
              <Button variant="outline" asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
