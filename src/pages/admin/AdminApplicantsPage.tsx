import { useEffect, useMemo, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { FadeIn } from "@/components/animations/FadeIn";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { SessionFilterSelect } from "@/components/admin/SessionFilterSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "@/lib/compat/link";
import { Eye, Search } from "lucide-react";
import { APPLICATION_STATUS_LABELS } from "@/constants/statuses";
import type { ApplicationStatus } from "@/constants/statuses";
import { formatDate } from "@/lib/utils";
import { getAdminPeriods, type AdminPeriod } from "@/lib/admin";
import {
  countApplications,
  listApplications,
  listExamAttemptsByApplications,
  type ApplicationRow,
  type ExamAttemptRow,
} from "@/lib/admin-applications";

const PAGE_SIZE = 20;
const routeApi = getRouteApi("/admin/applicants");

function buildSearch(params: { page?: number; period?: string; q?: string }) {
  const s: Record<string, string> = {};
  if (params.page && params.page > 1) s.page = String(params.page);
  if (params.period) s.period = params.period;
  if (params.q) s.q = params.q;
  return s;
}

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
  if (currentPage >= totalPages - 2)
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages] as const;
}

function statusVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

export function AdminApplicantsPage() {
  const { page: pageParam, period: periodParam, q: qParam } = routeApi.useSearch();
  const navigate = useNavigate();

  const q = (qParam ?? "").trim();
  const requestedPage = Math.max(Number(pageParam ?? 1) || 1, 1);

  const [periods, setPeriods] = useState<AdminPeriod[]>([]);
  const [searchInput, setSearchInput] = useState(q);
  const [data, setData] = useState<{
    apps: ApplicationRow[];
    total: number;
    attempts: ExamAttemptRow[];
  } | null>(null);

  useEffect(() => {
    getAdminPeriods().then(setPeriods).catch((e) => console.error("[applicants periods]", e));
  }, []);

  const effectivePeriodId = periodParam === "all" ? undefined : periodParam ?? periods[0]?.id;
  const currentPeriodValue = periodParam === "all" ? "all" : effectivePeriodId;

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    let active = true;
    setData(null);
    (async () => {
      const filters = { periodId: effectivePeriodId, q };
      const total = await countApplications(filters);
      const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
      const currentPage = Math.min(requestedPage, totalPages);
      const apps = await listApplications({ ...filters, page: currentPage, pageSize: PAGE_SIZE });
      const attempts = await listExamAttemptsByApplications(apps.map((a) => a.id));
      if (active) setData({ apps, total, attempts });
    })().catch((e) => console.error("[applicants]", e));
    return () => {
      active = false;
    };
  }, [effectivePeriodId, q, requestedPage]);

  const attemptMap = useMemo(() => {
    const m = new Map<string, ExamAttemptRow>();
    for (const row of data?.attempts ?? []) if (!m.has(row.applicationId)) m.set(row.applicationId, row);
    return m;
  }, [data]);

  if (!data) return <AdminLoading />;

  const total = data.total;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);
  const pageItems = getPageItems(currentPage, totalPages);
  const periodForHref = currentPeriodValue === "all" ? "all" : currentPeriodValue;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-h3 font-bold text-foreground">Applicants</h1>
            <p className="text-muted-foreground text-sm mt-1">{total} total applications</p>
          </div>
          {periods.length > 0 && (
            <SessionFilterSelect
              periods={periods}
              currentPeriodId={currentPeriodValue}
              onSelect={(value) =>
                navigate({ to: "/admin/applicants", search: buildSearch({ period: value, q }) })
              }
            />
          )}
        </div>
      </FadeIn>

      <FadeIn>
        <Card>
          <CardHeader className="pb-3">
            <form
              className="flex items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({
                  to: "/admin/applicants",
                  search: buildSearch({ period: periodForHref, q: searchInput.trim() }),
                });
              }}
            >
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  name="q"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search applicants…"
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-8">
                Search
              </Button>
            </form>
          </CardHeader>
          <CardContent className="p-0">
            {total > 0 ? (
              <div className="px-6 pt-3 text-xs text-muted-foreground">
                Showing {start}-{end} of {total}
              </div>
            ) : null}
            {data.apps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No applications found.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.apps.map((app) => {
                  const attempt = attemptMap.get(app.id);
                  const percentage =
                    attempt && attempt.score !== null && (attempt.totalMarks ?? 0) > 0
                      ? Math.round((Number(attempt.score) / Number(attempt.totalMarks)) * 100)
                      : null;
                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {app.firstName} {app.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.applicationCode} · Applied {formatDate(app.createdAt)}
                        </p>
                        {attempt ? (
                          <p className="text-xs text-muted-foreground">
                            Exam: {attempt.status.replace(/_/g, " ")}
                            {percentage !== null ? ` · ${percentage}%` : ""}
                            {attempt.passed !== null ? ` · ${attempt.passed ? "Passed" : "Failed"}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={statusVariant(app.status)} className="capitalize text-xs">
                          {APPLICATION_STATUS_LABELS[app.status as ApplicationStatus]}
                        </Badge>
                        <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Link href={`/admin/applicants/${app.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {totalPages > 1 ? (
        <FadeIn>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {currentPage > 1 ? (
                  <PaginationPrevious
                    href={`/admin/applicants?${new URLSearchParams(buildSearch({ page: currentPage - 1, period: periodForHref, q })).toString()}`}
                  />
                ) : (
                  <span className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-muted-foreground opacity-50">
                    Previous
                  </span>
                )}
              </PaginationItem>

              {pageItems.map((item, index) => (
                <PaginationItem key={`${item}-${index}`}>
                  {item === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href={`/admin/applicants?${new URLSearchParams(buildSearch({ page: item, period: periodForHref, q })).toString()}`}
                      isActive={item === currentPage}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                {currentPage < totalPages ? (
                  <PaginationNext
                    href={`/admin/applicants?${new URLSearchParams(buildSearch({ page: currentPage + 1, period: periodForHref, q })).toString()}`}
                  />
                ) : (
                  <span className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-muted-foreground opacity-50">
                    Next
                  </span>
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </FadeIn>
      ) : null}
    </div>
  );
}
