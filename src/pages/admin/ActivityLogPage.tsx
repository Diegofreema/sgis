import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { ActivityLogClient } from "@/components/admin/ActivityLogClient";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getActivityLogs, type ActivityLog } from "@/lib/admin";

const PAGE_SIZE = 20;
const routeApi = getRouteApi("/admin/activity");

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
  if (currentPage >= totalPages - 2)
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages] as const;
}

function href(page: number): string {
  return page > 1 ? `/admin/activity?page=${page}` : "/admin/activity";
}

export function ActivityLogPage() {
  const { page: pageParam } = routeApi.useSearch();
  const requestedPage = Math.max(Number(pageParam ?? 1) || 1, 1);

  const [data, setData] = useState<{ logs: ActivityLog[]; total: number } | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    getActivityLogs(requestedPage, PAGE_SIZE)
      .then((d) => active && setData(d))
      .catch((e) => console.error("[activity log]", e));
    return () => {
      active = false;
    };
  }, [requestedPage]);

  if (!data) return <AdminLoading />;

  const { logs, total } = data;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Activity log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} recorded action{total !== 1 ? "s" : ""}
          {total > 0 ? ` · showing ${start}–${end}` : ""} — every admin change is recorded
          automatically.
        </p>
      </div>

      <ActivityLogClient logs={logs} />

      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              {currentPage > 1 ? (
                <PaginationPrevious href={href(currentPage - 1)} />
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
                  <PaginationLink href={href(item)} isActive={item === currentPage}>
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              {currentPage < totalPages ? (
                <PaginationNext href={href(currentPage + 1)} />
              ) : (
                <span className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] text-muted-foreground opacity-50">
                  Next
                </span>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
