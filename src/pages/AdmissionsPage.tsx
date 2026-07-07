import Link from "@/lib/compat/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";
import { AdmissionCTA } from "@/components/public/AdmissionCTA";

const requirements = [
  "Completed online application form",
  "Recent academic transcripts (last 2 years)",
  "Two academic reference letters",
  "Passport photograph (digital)",
  "Birth certificate (copy)",
  "Medical fitness certificate",
  "Payment of application fee",
];

export function AdmissionsPage() {
  return (
    <>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-3xl">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Join Us</p>
            <h1 className="text-h1 font-serif font-bold text-foreground mb-6 leading-tight">
              Admissions at Sankt Georg
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We welcome applications from students who demonstrate intellectual
              curiosity, strong character, and a commitment to community.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="gap-2 font-medium shadow-brand-md">
                <Link href="/entrance-exam">
                  Start Your Application <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <FadeIn direction="left">
              <div className="space-y-6">
                <h2 className="text-h3 font-serif font-semibold text-foreground">Admission Requirements</h2>
                <ul className="space-y-3">
                  {requirements.map((req) => (
                    <li key={req} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            <FadeIn direction="right" delay={0.1}>
              <div className="space-y-6">
                <h2 className="text-h3 font-serif font-semibold text-foreground">Classes We Admit</h2>
                <div className="grid grid-cols-3 gap-3">
                  {["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((g) => (
                    <div key={g} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-center text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors">
                      {g}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Subject to availability. Contact admissions for current vacancies.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <AdmissionCTA />
    </>
  );
}
