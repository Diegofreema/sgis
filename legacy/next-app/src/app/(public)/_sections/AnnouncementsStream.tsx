/**
 * Server Component — streams in the announcement banner.
 * No `'use cache'`: announcements are fetched fresh on every request so
 * urgent notices appear immediately without a cache flush.
 * Wrapped in <Suspense> by the parent — if this is slow the page still
 * paints the hero and static content first.
 */
import { getActiveAnnouncement } from "@/server/queries/cms.queries";
import { AnnouncementBanner } from "@/components/public/AnnouncementBanner";
import type { Announcement } from "@/types/cms";
import type { ContentStatus } from "@/constants/statuses";

export async function AnnouncementsStream() {
  let raw;
  try {
    raw = await getActiveAnnouncement();
  } catch (error) {
    console.error("[AnnouncementsStream] Failed to load public announcements", error);
    return null;
  }

  if (!raw) return null;

  const announcement = {
    ...raw,
    audience: raw.audience as Announcement["audience"],
    status: raw.status as ContentStatus,
    publishedAt: raw.publishedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };

  return <AnnouncementBanner key={announcement.id} announcement={announcement} />;
}
