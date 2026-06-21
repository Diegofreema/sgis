import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { getActiveApplicationPeriod } from "@/server/queries/applications.queries";
import { getCurrentProfile } from "@/lib/auth";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Entrance Examination",
  description: "Apply for the Sankt Georg International School entrance examination.",
};

export default async function EntranceExamPage() {
  const [period, profile] = await Promise.all([
    getActiveApplicationPeriod(),
    getCurrentProfile(),
  ]);

  const isOpen = !!period;
  const applyHref = profile ? "/dashboard/application" : "/register";

  const steps = [
    { step: "01", title: "Create an Account", desc: "Register on our portal to get started." },
    { step: "02", title: "Complete Your Profile", desc: "Fill in your personal and academic information." },
    { step: "03", title: "Pay Registration Fee", desc: "Pay into the school's bank account and upload your receipt." },
    { step: "04", title: "Write the Exam", desc: "Take the online examination on the scheduled date." },
    { step: "05", title: "Await Results", desc: "Results will be communicated after review." },
    { step: "06", title: "Receive Offer", desc: "Successful candidates receive an admission offer." },
  ];

  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-2xl mx-auto text-center">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              Join Our School
            </p>
            <h1 className="text-h1 font-serif font-bold text-foreground mb-6 leading-tight">
              Entrance Examination
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Our entrance examination assesses academic readiness, critical thinking,
              and potential. It is the first step toward an extraordinary education.
            </p>
            {isOpen && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button asChild size="lg" className="gap-2 font-medium shadow-brand-sm">
                  <Link href={applyHref}>
                    Apply Now <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/admissions">Learn More</Link>
                </Button>
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* Application status card */}
      <section className="py-12">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-2xl mx-auto">
            {isOpen && period ? (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                    <div className="min-w-0">
                      <h2 className="font-serif font-semibold text-foreground">
                        Applications Are Open
                      </h2>
                      <p className="text-sm text-muted-foreground truncate">
                        {period.title}
                      </p>
                    </div>
                    <Badge className="ml-auto shrink-0 bg-success/20 text-success border-success/30">
                      Open
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span>Closes: {formatDate(period.applicationEndDate.toISOString())}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <span>Exam: {formatDate(period.examStartDate.toISOString())}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Registration Fee</p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(Number(period.registrationFee), period.currency)}
                      </p>
                    </div>
                    <Button asChild className="gap-2 font-medium shadow-brand-sm">
                      <Link href={applyHref}>
                        {profile ? "Go to Application" : "Apply Now"}{" "}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-muted">
                <CardContent className="p-8 text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
                      Applications Are Currently Closed
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Entrance examination applications are currently closed. Please
                      check back later or follow our announcements for updates on
                      the next application window.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button asChild variant="outline" className="font-medium">
                      <Link href="/news">View Announcements</Link>
                    </Button>
                    <Button asChild variant="outline" className="font-medium">
                      <Link href="/contact">Contact Admissions</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </FadeIn>
        </div>
      </section>

      {/* Process steps */}
      <section className="section-padding bg-muted/20">
        <div className="container mx-auto container-padding">
          <FadeIn className="text-center mb-12 space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              The Process
            </p>
            <h2 className="text-h2 font-serif font-bold text-foreground">
              How It Works
            </h2>
          </FadeIn>
          <StaggerChildren className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((s) => (
              <StaggerItem key={s.step}>
                <div className="glass-card rounded-2xl p-6 space-y-3 h-full">
                  <p className="font-serif text-3xl font-bold text-primary/30">{s.step}</p>
                  <h3 className="font-serif font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>

          {/* Bottom CTA */}
          {isOpen && (
            <FadeIn className="mt-12 text-center">
              <Button asChild size="lg" className="gap-2 font-medium shadow-brand-sm">
                <Link href={applyHref}>
                  {profile ? "Continue to Application" : "Start Your Application"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </FadeIn>
          )}
        </div>
      </section>
    </>
  );
}
