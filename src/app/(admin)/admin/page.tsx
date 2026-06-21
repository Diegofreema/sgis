import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { db, applications, payments, announcements, applicationPeriods } from "@/db";
import { eq, count, desc } from "drizzle-orm";
import { StatsCard } from "@/components/admin/StatsCard";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionFilterSelect } from "./SessionFilterSelect";
import {
  Users, FileText, CheckCircle2, CreditCard, TrendingUp,
  XCircle, Bell, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

/* ─── Async sub-components ──────────────────────────────────────────── */

async function StatsGrid({ periodId }: { periodId?: string }) {
  if (!db) return null;

  const appFilter = periodId
    ? eq(applications.applicationPeriodId, periodId)
    : undefined;
  const payFilter = periodId
    ? eq(payments.applicationId, periodId)
    : undefined;

  const [
    totalApplicants,
    pendingApps,
    approvedApps,
    totalPayments,
    successPayments,
    failedPayments,
    publishedAnnouncements,
  ] = await Promise.all([
    db.select({ count: count() }).from(applications).where(appFilter).then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: count() }).from(applications).where(
      periodId ? eq(applications.applicationPeriodId, periodId) : eq(applications.status, "under_review")
    ).then((r) => {
      if (periodId) {
        // count under_review within the period
        return db!.select({ count: count() }).from(applications).where(
          eq(applications.applicationPeriodId, periodId)
        ).then((all) => {
          // can't combine two where clauses easily here, just return under_review total
          return 0;
        });
      }
      return Number(r[0]?.count ?? 0);
    }),
    db.select({ count: count() }).from(applications)
      .where(eq(applications.status, "approved"))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: count() }).from(payments).then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: count() }).from(payments).where(eq(payments.status, "approved")).then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: count() }).from(payments).where(eq(payments.status, "rejected")).then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: count() }).from(announcements).where(eq(announcements.status, "published")).then((r) => Number(r[0]?.count ?? 0)),
  ]);

  // Simplified period-filtered counts using and()
  let filteredApplicants = totalApplicants;
  let filteredApproved = approvedApps;
  let filteredPending = pendingApps;

  if (periodId) {
    const { and } = await import("drizzle-orm");
    [filteredApplicants, filteredApproved, filteredPending] = await Promise.all([
      db.select({ count: count() }).from(applications)
        .where(eq(applications.applicationPeriodId, periodId))
        .then((r) => Number(r[0]?.count ?? 0)),
      db.select({ count: count() }).from(applications)
        .where(and(eq(applications.applicationPeriodId, periodId), eq(applications.status, "approved")))
        .then((r) => Number(r[0]?.count ?? 0)),
      db.select({ count: count() }).from(applications)
        .where(and(eq(applications.applicationPeriodId, periodId), eq(applications.status, "under_review")))
        .then((r) => Number(r[0]?.count ?? 0)),
    ]);
  }

  return (
    <StaggerChildren className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StaggerItem><StatsCard title="Total Applicants"   value={filteredApplicants}     icon={Users}        variant="primary" /></StaggerItem>
      <StaggerItem><StatsCard title="Under Review"       value={filteredPending}        icon={Clock}        variant="warning" /></StaggerItem>
      <StaggerItem><StatsCard title="Approved"           value={filteredApproved}       icon={CheckCircle2} variant="success" /></StaggerItem>
      <StaggerItem><StatsCard title="Announcements"      value={publishedAnnouncements} icon={Bell} /></StaggerItem>
      <StaggerItem><StatsCard title="Total Payments"     value={totalPayments}          icon={CreditCard} /></StaggerItem>
      <StaggerItem><StatsCard title="Approved Payments"  value={successPayments}        icon={TrendingUp}   variant="success" /></StaggerItem>
      <StaggerItem><StatsCard title="Rejected Payments"  value={failedPayments}         icon={XCircle}      variant="destructive" /></StaggerItem>
      <StaggerItem><StatsCard title="Applications"       value={filteredApplicants}     icon={FileText}     description={periodId ? "This session" : "All time"} /></StaggerItem>
    </StaggerChildren>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

async function RecentApplications({ periodId }: { periodId?: string }) {
  if (!db) return null;

  const { eq, and } = await import("drizzle-orm");

  const recentApps = await db
    .select()
    .from(applications)
    .where(periodId ? eq(applications.applicationPeriodId, periodId) : undefined)
    .orderBy(desc(applications.createdAt))
    .limit(5);

  function statusVariant(status: string): "default" | "destructive" | "secondary" {
    if (status === "approved") return "default";
    if (status === "rejected") return "destructive";
    return "secondary";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-base">Recent Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {recentApps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No applications yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentApps.map((app) => (
              <div key={app.id} className="flex items-center justify-between py-3 gap-4">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {app.intendedClass}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(app.createdAt.toISOString())}
                  </p>
                </div>
                <Badge variant={statusVariant(app.status)} className="shrink-0 capitalize text-xs">
                  {app.status.replace(/_/g, " ")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentAppsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3"><Skeleton className="h-5 w-44" /></CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AdminOverviewPage({ searchParams }: Props) {
  await requireRole(["admin"]);
  const { period } = await searchParams;

  const periods = db
    ? await db
        .select({ id: applicationPeriods.id, title: applicationPeriods.title })
        .from(applicationPeriods)
        .orderBy(desc(applicationPeriods.createdAt))
    : [];

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-h3 font-bold text-foreground">Admin Overview</h1>
            <p className="text-muted-foreground text-sm mt-1">School management at a glance.</p>
          </div>
          {periods.length > 0 && (
            <SessionFilterSelect
              periods={periods}
              currentPeriodId={period}
            />
          )}
        </div>
      </FadeIn>

      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid periodId={period} />
      </Suspense>

      <FadeIn>
        <Suspense fallback={<RecentAppsSkeleton />}>
          <RecentApplications periodId={period} />
        </Suspense>
      </FadeIn>
    </div>
  );
}
