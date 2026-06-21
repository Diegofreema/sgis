import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Under Maintenance — SGIS",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-8 max-w-md text-center">
        <Image
          src="/logo.jpeg"
          alt="Sankt Georg International School"
          width={72}
          height={72}
          className="rounded-xl shadow-md"
          priority
        />

        <div className="space-y-3">
          <h1 className="font-serif text-4xl font-bold text-foreground tracking-tight">
            We&rsquo;ll be right back
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Sankt Georg International School portal is undergoing scheduled
            maintenance. We&rsquo;ll be back shortly — thank you for your patience.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-warning animate-pulse" />
          Maintenance in progress
        </div>

        <div className="border border-border rounded-xl p-5 w-full text-left space-y-1 bg-card">
          <p className="text-xs font-medium text-foreground">Need help?</p>
          <p className="text-xs text-muted-foreground">
            Email:{" "}
            <a
              href="mailto:sanktgeorginternationalschool@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              sanktgeorginternationalschool@gmail.com
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Phone:{" "}
            <a href="tel:+2349165573514" className="text-primary underline underline-offset-2">
              +234 916 557 3514
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
