import { useEffect, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { StatsCard } from "@/components/admin/StatsCard";
import { SessionFilterSelect } from "@/components/admin/SessionFilterSelect";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, CheckCircle2, Bell, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  getAdminPeriods,
  getDashboardData,
  type AdminPeriod,
  type DashboardStats,
  type RecentApplication,
} from "@/lib/admin";

const routeApi = getRouteApi("/admin/");

function statusVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

export function AdminDashboard() {
  const { period } = routeApi.useSearch();
  const navigate = useNavigate();
  const selectedPeriod = period === "all" || !period ? undefined : period;

  const [periods, setPeriods] = useState<AdminPeriod[]>([]);
  const [data, setData] = useState<{ stats: DashboardStats; recent: RecentApplication[] } | null>(
    null,
  );

  useEffect(() => {
    getAdminPeriods().then(setPeriods).catch((e) => console.error("[admin periods]", e));
  }, []);

  useEffect(() => {
    let active = true;
    setData(null);
    getDashboardData(selectedPeriod)
      .then((d) => active && setData(d))
      .catch((e) => console.error("[admin dashboard]", e));
    return () => {
      active = false;
    };
  }, [selectedPeriod]);

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
              currentPeriodId={period === "all" ? "all" : selectedPeriod}
              onSelect={(value) => navigate({ to: "/admin", search: { period: value } })}
            />
          )}
        </div>
      </FadeIn>

      {!data ? (
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
      ) : (
        <StaggerChildren className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem><StatsCard title="Total Applicants" value={data.stats.total} icon={Users} variant="primary" /></StaggerItem>
          <StaggerItem><StatsCard title="Pending" value={data.stats.pending} icon={Clock} variant="warning" /></StaggerItem>
          <StaggerItem><StatsCard title="Approved" value={data.stats.approved} icon={CheckCircle2} variant="success" /></StaggerItem>
          <StaggerItem><StatsCard title="Announcements" value={data.stats.announcements} icon={Bell} /></StaggerItem>
          <StaggerItem><StatsCard title="Applications" value={data.stats.total} icon={FileText} description={selectedPeriod ? "This session" : "All time"} /></StaggerItem>
        </StaggerChildren>
      )}

      <FadeIn>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base">Recent Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
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
            ) : data.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No applications yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.recent.map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{app.intendedClass}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(app.createdAt)}</p>
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
      </FadeIn>
    </div>
  );
}
