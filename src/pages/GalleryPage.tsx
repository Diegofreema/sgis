import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { FadeIn } from "@/components/animations/FadeIn";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { countGalleryItems, listGalleryItems } from "@/lib/queries";
import type { GalleryItem } from "@/types/cms";

const PAGE_SIZE = 20;
const routeApi = getRouteApi("/public/gallery");

function buildGalleryHref(page?: number) {
  if (!page || page <= 1) return "/gallery";
  return `/gallery?page=${page}`;
}

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages] as const;
  }
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages] as const;
}

function GallerySkeleton() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {[260, 380, 300, 420, 280, 350].map((h, i) => (
        <Skeleton key={i} className="break-inside-avoid w-full rounded-xl" style={{ height: h }} />
      ))}
    </div>
  );
}

export function GalleryPage() {
  const { page: pageParam } = routeApi.useSearch();
  const requestedPage = Math.max(Number(pageParam ?? 1) || 1, 1);

  const [data, setData] = useState<{ items: GalleryItem[]; total: number } | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    Promise.all([countGalleryItems(), listGalleryItems({ page: requestedPage, pageSize: PAGE_SIZE })])
      .then(([total, items]) => active && setData({ items, total }))
      .catch((error) => {
        console.error("[GalleryPage]", error);
        if (active) setData({ items: [], total: 0 });
      });
    return () => {
      active = false;
    };
  }, [requestedPage]);

  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(totalItems / PAGE_SIZE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const items = data?.items ?? [];
  const start = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalItems);
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-2xl">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              Campus Life
            </p>
            <h1 className="text-h1 font-serif font-bold text-foreground mb-4">Our Gallery</h1>
            <p className="text-xl text-muted-foreground">
              A visual tour of campus life, events, and learning at Sankt Georg.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          {data === null ? (
            <GallerySkeleton />
          ) : (
            <>
              {totalItems > 0 ? (
                <FadeIn className="mb-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <p>
                    Showing {start}-{end} of {totalItems}
                  </p>
                  <p>
                    Page {currentPage} of {totalPages}
                  </p>
                </FadeIn>
              ) : null}

              {items.length > 0 ? (
                <>
                  <GalleryGrid items={items} />

                  {totalPages > 1 ? (
                    <FadeIn className="mt-10">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            {currentPage > 1 ? (
                              <PaginationPrevious href={buildGalleryHref(currentPage - 1)} />
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
                                  href={buildGalleryHref(item)}
                                  isActive={item === currentPage}
                                >
                                  {item}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}

                          <PaginationItem>
                            {currentPage < totalPages ? (
                              <PaginationNext href={buildGalleryHref(currentPage + 1)} />
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
                </>
              ) : (
                <FadeIn className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-20 text-center">
                  <div className="mx-auto max-w-md space-y-3">
                    <h2 className="font-serif text-2xl font-semibold text-foreground">
                      No gallery images yet
                    </h2>
                    <p className="text-muted-foreground">
                      School photos will appear here once they are uploaded from admin panel.
                    </p>
                  </div>
                </FadeIn>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
