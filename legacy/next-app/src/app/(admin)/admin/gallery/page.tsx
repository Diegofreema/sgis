import { FadeIn } from '@/components/animations/FadeIn';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { requireRole } from '@/lib/auth';
import {
  countGalleryItems,
  listGalleryItems,
} from '@/server/queries/cms.queries';
import { GalleryAdminClient } from './GalleryAdminClient';

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

function buildAdminGalleryHref(page?: number) {
  if (!page || page <= 1) return '/admin/gallery';
  return `/admin/gallery?page=${page}`;
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

export default async function AdminGalleryPage({ searchParams }: Props) {
  await requireRole(['admin']);

  const params = await searchParams;
  const requestedPage = Math.max(Number(params.page ?? '1') || 1, 1);
  const totalItems = await countGalleryItems();
  const totalPages = Math.max(Math.ceil(totalItems / PAGE_SIZE), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const items = await listGalleryItems({ page: currentPage, pageSize: PAGE_SIZE });
  const start = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalItems);
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="space-y-6">
      <GalleryAdminClient
        initialItems={items}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        start={start}
        end={end}
      />

      {totalPages > 1 ? (
        <FadeIn>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {currentPage > 1 ? (
                  <PaginationPrevious href={buildAdminGalleryHref(currentPage - 1)} />
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
                      href={buildAdminGalleryHref(item)}
                      isActive={item === currentPage}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                {currentPage < totalPages ? (
                  <PaginationNext href={buildAdminGalleryHref(currentPage + 1)} />
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
