/**
 * Entrance exam page — SSR (dynamic by default with cacheComponents).
 * Checks the live active application period on every request so students
 * always see accurate open/closed state.  No `force-dynamic` needed —
 * uncached DB calls are already excluded from prerenders.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Calendar, CheckCircle2, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { getActiveApplicationPeriod } from "@/server/queries/applications.queries";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Entrance Examination",
  description: "Apply for the Sankt Georg International School entrance examination.",
};

export default async function EntranceExamPage() {
  const period = await getActiveApplicationPeriod();
  const isOpen = !!period;

  const steps = [
    { step: "01", title: "Create an Account", desc: "Register on our portal to get started." },
    { step: "02", title: "Complete Your Profile", desc: "Fill in your personal and academic information." },
    { step: "03", title: "Pay Registration Fee", desc: "Complete the secure online payment." },
    { step: "04", title: "Write the Exam", desc: "Take the online examination on the scheduled date." },
    { step: "05", title: "Await Results", desc: "Results will be communicated after review." },
    { step: "06", title: "Receive Offer", desc: "Successful candidates receive an admission offer." },
  ];

  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-3xl">
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
          </FadeIn>
        </div>
      </section>

      {/* Application Status Card */}
      <section className="py-12">
        <div className="container mx-auto container-padding">
          <FadeIn>
            {isOpen && period ? (
              <Card className="border-success/30 bg-success/5 max-w-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                    <div>
                      <h2 className="font-serif font-semibold text-foreground">
                        Applications Are Open
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {period.title}
                      </p>
                    </div>
                    <Badge className="ml-auto bg-success/20 text-success border-success/30">
                      Open
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>Closes: {formatDate(period.applicationEndDate.toISOString())}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
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
                      <Link href="/register">
                        Apply Now <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-muted max-w-2xl">
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
                  <p className="font-serif text-3xl font-bold text-primary/30">
                    {s.step}
                  </p>
                  <h3 className="font-serif font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>
    </>
  );
}
