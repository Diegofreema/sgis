import { FadeIn } from '@/components/animations/FadeIn';
import { SessionFilterSelect } from '@/app/(admin)/admin/SessionFilterSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { APPLICATION_STATUS_LABELS } from '@/constants/statuses';
import { db, applicationPeriods, examAttempts } from '@/db';
import { requireRole } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import {
  countApplications,
  listApplications,
} from '@/server/queries/applications.queries';
import { desc, inArray } from 'drizzle-orm';
import { Eye, Search } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ page?: string; period?: string; q?: string }>;
};

function buildApplicantsHref(params: {
  page?: number;
  period?: string;
  q?: string;
}) {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.period) search.set('period', params.period);
  if (params.q) search.set('q', params.q);
  const query = search.toString();
  return query ? `/admin/applicants?${query}` : '/admin/applicants';
}

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages] as const;
}

export default async function ApplicantsPage({ searchParams }: Props) {
  await requireRole(['admin']);
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const requestedPage = Math.max(Number(params.page ?? '1') || 1, 1);
  const selectedPeriod =
    params.period === 'all' ? undefined : params.period;

  const periods = db
    ? await db
        .select({ id: applicationPeriods.id, title: applicationPeriods.title })
        .from(applicationPeriods)
        .orderBy(desc(applicationPeriods.createdAt))
    : [];
  const effectivePeriodId =
    params.period === 'all' ? undefined : selectedPeriod ?? periods[0]?.id;
  const currentPeriodValue =
    params.period === 'all' ? 'all' : effectivePeriodId;

  const totalApplications = await countApplications({
    periodId: effectivePeriodId,
    q,
  });

  const totalPages = Math.max(Math.ceil(totalApplications / PAGE_SIZE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const apps = await listApplications({
    periodId: effectivePeriodId,
    q,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });
  const attemptRows =
    db && apps.length > 0
      ? await db
          .select({
            applicationId: examAttempts.applicationId,
            status: examAttempts.status,
            score: examAttempts.score,
            totalMarks: examAttempts.totalMarks,
            passed: examAttempts.passed,
            createdAt: examAttempts.createdAt,
          })
          .from(examAttempts)
          .where(inArray(examAttempts.applicationId, apps.map((app) => app.id)))
          .orderBy(desc(examAttempts.createdAt))
      : [];
  const attemptMap = new Map<string, (typeof attemptRows)[number]>();
  for (const row of attemptRows) {
    if (!attemptMap.has(row.applicationId)) {
      attemptMap.set(row.applicationId, row);
    }
  }
  const start = totalApplications === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalApplications);
  const pageItems = getPageItems(currentPage, totalPages);
  const periodParam =
    currentPeriodValue === 'all' ? 'all' : currentPeriodValue;

  function statusVariant(
    status: string,
  ): 'default' | 'destructive' | 'secondary' {
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    return 'secondary';
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-h3 font-bold text-foreground">
              Applicants
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalApplications} total applications
            </p>
          </div>
          {periods.length > 0 && (
            <SessionFilterSelect
              periods={periods}
              currentPeriodId={currentPeriodValue}
            />
          )}
        </div>
      </FadeIn>

      <FadeIn>
        <Card>
          <CardHeader className="pb-3">
            <form className="flex items-center gap-3" method="get">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search applicants…"
                  className="pl-9 h-8 text-sm"
                />
              </div>
              {periodParam ? (
                <input type="hidden" name="period" value={periodParam} />
              ) : null}
              <Button type="submit" size="sm" variant="secondary" className="h-8">
                Search
              </Button>
            </form>
          </CardHeader>
          <CardContent className="p-0">
            {totalApplications > 0 ? (
              <div className="border-b border-border px-6 py-3 text-xs text-muted-foreground">
                Showing {start}-{end} of {totalApplications}
              </div>
            ) : null}
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No applications found.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      {(() => {
                        const attempt = attemptMap.get(app.id);
                        const percentage =
                          attempt && attempt.score !== null && (attempt.totalMarks ?? 0) > 0
                            ? Math.round((Number(attempt.score) / Number(attempt.totalMarks)) * 100)
                            : null;
                        return (
                          <>
                      <p className="text-sm font-medium text-foreground">
                        {app.firstName} {app.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {app.applicationCode} · Applied{' '}
                        {formatDate(app.createdAt.toISOString())}
                      </p>
                            {attempt ? (
                              <p className="text-xs text-muted-foreground">
                                Exam: {attempt.status.replace(/_/g, ' ')}
                                {percentage !== null ? ` · ${percentage}%` : ''}
                                {attempt.passed !== null ? ` · ${attempt.passed ? 'Passed' : 'Failed'}` : ''}
                              </p>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={statusVariant(app.status)}
                        className="capitalize text-xs"
                      >
                        {
                          APPLICATION_STATUS_LABELS[
                            app.status as keyof typeof APPLICATION_STATUS_LABELS
                          ]
                        }
                      </Badge>
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                      >
                        <Link href={`/admin/applicants/${app.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
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
                    href={buildApplicantsHref({
                      page: currentPage - 1,
                      period: periodParam,
                      q,
                    })}
                  />
                ) : (
                  <span className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-muted-foreground opacity-50">
                    Previous
                  </span>
                )}
              </PaginationItem>

              {pageItems.map((item, index) => (
                <PaginationItem key={`${item}-${index}`}>
                  {item === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href={buildApplicantsHref({
                        page: item,
                        period: periodParam,
                        q,
                      })}
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
                    href={buildApplicantsHref({
                      page: currentPage + 1,
                      period: periodParam,
                      q,
                    })}
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
