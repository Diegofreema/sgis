/**
 * Dashboard overview — SSR with granular Suspense streaming.
 *
 * Rendering strategy:
 * - Header + quick-links: static shell, painted immediately.
 * - <ApplicationCard>  : streams in — fetches application + active period.
 * - <ExamCard>         : streams in — fetches exam + attempt (only if approved).
 *
 * Each <Suspense> boundary resolves independently, so a slow exam lookup
 * never delays the application card.
 *
 * Server-side auth: requireAuth() at page level (layout already calls it;
 * React cache() ensures only one DB round-trip for both).
 */
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { db, applications, exams, examAttempts, applicationPeriods, profiles } from "@/db";
import { eq, and } from "drizzle-orm";
import { ApplicationStatusCard } from "@/components/dashboard/ApplicationStatusCard";
import { ExamAccessCard } from "@/components/dashboard/ExamAccessCard";
import { getActiveApplicationPeriod } from "@/server/queries/applications.queries";
import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import type { UserProfile } from "@/types/auth";

/* ─── Streaming sub-components ─────────────────────────────────────── */

async function ApplicationCard({ profile }: { profile: UserProfile }) {
  const [application, activePeriod] = await Promise.all([
    db
      ? db
          .select()
          .from(applications)
          .where(eq(applications.userId, profile.id))
          .orderBy(applications.createdAt)
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
    getActiveApplicationPeriod(),
  ]);

  return (
    <ApplicationStatusCard
      application={application}
      hasActivePeriod={!!activePeriod}
    />
  );
}

async function ExamCard({ profile }: { profile: UserProfile }) {
  let exam = null;
  let attempt = null;
  let application = null;

  if (db) {
    application = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, profile.id))
      .orderBy(applications.createdAt)
      .limit(1)
      .then((r) => r[0] ?? null);

    if (application?.status === "approved") {
      const period = application.applicationPeriodId
        ? await db
            .select()
            .from(applicationPeriods)
            .where(eq(applicationPeriods.id, application.applicationPeriodId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : null;

      if (period) {
        exam = await db
          .select()
          .from(exams)
          .where(and(eq(exams.applicationPeriodId, period.id), eq(exams.status, "active")))
          .limit(1)
          .then((r) => r[0] ?? null);

        if (exam) {
          attempt = await db
            .select()
            .from(examAttempts)
            .where(and(eq(examAttempts.userId, profile.id), eq(examAttempts.examId, exam.id)))
            .limit(1)
            .then((r) => r[0] ?? null);
        }
      }
    }
  }

  return <ExamAccessCard exam={exam} attempt={attempt} application={application} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default async function DashboardPage() {
  // React cache() deduplicates this call — layout already called it.
  const profile = await requireAuth();
  const linkedStudents =
    profile.role === "parent" && db
      ? await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.parentProfileId, profile.id))
      : [];

  const firstName = profile.firstName ?? "Student";
  const profileComplete =
    !!profile.firstName && !!profile.lastName && !!profile.phone && !!profile.dateOfBirth;
  const isParent = profile.role === "parent";

  return (
    <div className="space-y-8">
      {/* Header — static, painted immediately */}
      <FadeIn>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-h3 font-bold text-foreground">
              Good day, {firstName} 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isParent
                ? "Here’s an overview of the student accounts linked to your parent dashboard."
                : "Here&apos;s an overview of your application journey."}
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Profile incomplete banner */}
      {!profileComplete && (
        <FadeIn>
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 flex items-center gap-3">
            <Bell className="h-4 w-4 text-warning shrink-0" />
            <p className="text-sm text-foreground flex-1">
              {isParent
                ? "Your parent profile is incomplete. Finish it so student records stay accurate."
                : "Your profile is incomplete. Complete it to proceed with your application."}
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs border-warning/30 text-warning hover:bg-warning/10"
            >
              <Link href="/dashboard/profile">
                Complete Profile <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      )}

      {isParent ? (
        <StaggerChildren className="grid md:grid-cols-2 gap-6">
          <StaggerItem>
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Linked Students</p>
              <p className="font-serif text-4xl font-bold text-foreground">
                {linkedStudents.length}
              </p>
              <p className="text-sm text-muted-foreground">
                Create student accounts, check password rotation status, and continue their
                application steps.
              </p>
              <Button asChild className="gap-2 font-medium shadow-brand-sm">
                <Link href="/dashboard/students">
                  Open Student Manager <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-3">
              <p className="text-sm font-medium text-primary">Parent workflow</p>
              <p className="text-sm text-muted-foreground">
                Student application, payment, exam-status, and result pages are all available
                from the student manager after you select a linked student.
              </p>
              <Button asChild variant="outline" className="gap-2 font-medium">
                <Link href="/dashboard/profile">
                  Review Parent Profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </StaggerItem>
        </StaggerChildren>
      ) : (
        <StaggerChildren className="grid md:grid-cols-2 gap-6">
          <StaggerItem>
            <Suspense fallback={<CardSkeleton />}>
              <ApplicationCard profile={profile} />
            </Suspense>
          </StaggerItem>

          <StaggerItem>
            <Suspense fallback={<CardSkeleton />}>
              <ExamCard profile={profile} />
            </Suspense>
          </StaggerItem>
        </StaggerChildren>
      )}

      {/* Quick links — static, no data */}
      <FadeIn>
        <div className="space-y-3">
          <h2 className="font-serif font-semibold text-foreground text-sm">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Edit Profile",   href: "/dashboard/profile",  icon: "👤" },
              ...(isParent
                ? [{ label: "My Students", href: "/dashboard/students", icon: "👨‍👩‍👧" }]
                : [
                    { label: "View Payments", href: "/dashboard/payments", icon: "💳" },
                    { label: "My Results", href: "/dashboard/results", icon: "🏆" },
                  ]),
              { label: "School News",    href: "/news",               icon: "📰" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-center hover:border-primary/30 hover:shadow-brand-sm transition-all group"
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
