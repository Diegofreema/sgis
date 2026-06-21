/**
 * Server Component — streams in the announcement banner.
 * No `'use cache'`: announcements are fetched fresh on every request so
 * urgent notices appear immediately without a cache flush.
 * Wrapped in <Suspense> by the parent — if this is slow the page still
 * paints the hero and static content first.
 */
import { listPublicAnnouncements } from "@/server/queries/cms.queries";
import { AnnouncementBanner } from "@/components/public/AnnouncementBanner";
import type { Announcement } from "@/types/cms";
import type { ContentStatus } from "@/constants/statuses";

export async function AnnouncementsStream() {
  let raw;
  try {
    raw = await listPublicAnnouncements(5);
  } catch (error) {
    console.error("[AnnouncementsStream] Failed to load public announcements", error);
    return null;
  }

  if (raw.length === 0) return null;

  const announcements = raw.map((a) => ({
    ...a,
    audience: a.audience as Announcement["audience"],
    status: a.status as ContentStatus,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return <AnnouncementBanner announcements={announcements} />;
}
