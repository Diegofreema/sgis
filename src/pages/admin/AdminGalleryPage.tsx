import { useCallback, useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { FadeIn } from "@/components/animations/FadeIn";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { GalleryAdminClient } from "@/components/admin/GalleryAdminClient";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { countGalleryItems, listGalleryItems } from "@/lib/queries";
import type { GalleryItem } from "@/types/cms";

const PAGE_SIZE = 20;
const routeApi = getRouteApi("/admin/gallery");

function buildHref(page?: number) {
  if (!page || page <= 1) return "/admin/gallery";
  return `/admin/gallery?page=${page}`;
}

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages] as const;
  if (currentPage >= totalPages - 2)
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages] as const;
}

export function AdminGalleryPage() {
  const { page: pageParam } = routeApi.useSearch();
  const requestedPage = Math.max(Number(pageParam ?? 1) || 1, 1);

  const [state, setState] = useState<{ items: GalleryItem[]; total: number } | null>(null);

  const load = useCallback(() => {
    Promise.all([countGalleryItems(), listGalleryItems({ page: requestedPage, pageSize: PAGE_SIZE })])
      .then(([total, items]) => setState({ total, items }))
      .catch((e) => console.error("[admin gallery]", e));
  }, [requestedPage]);

  useEffect(() => {
    setState(null);
    load();
  }, [load]);

  if (!state) return <AdminLoading />;

  const totalItems = state.total;
  const totalPages = Math.max(Math.ceil(totalItems / PAGE_SIZE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalItems);
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="space-y-6">
      <GalleryAdminClient
        initialItems={state.items}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        start={start}
        end={end}
        onChanged={load}
      />

      {totalPages > 1 ? (
        <FadeIn>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {currentPage > 1 ? (
                  <PaginationPrevious href={buildHref(currentPage - 1)} />
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
                    <PaginationLink href={buildHref(item)} isActive={item === currentPage}>
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                {currentPage < totalPages ? (
                  <PaginationNext href={buildHref(currentPage + 1)} />
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
