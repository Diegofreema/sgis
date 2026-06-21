/**
 * Server Component — streams in the gallery preview section.
 * `'use cache'` + cacheLife('hours'): gallery items cached and revalidated
 * hourly.  Streams independently so slow image DB lookups don't block the hero.
 */
import { cacheLife } from "next/cache";
import { listGalleryItems } from "@/server/queries/cms.queries";
import { GalleryPreview } from "@/components/public/GalleryPreview";

async function fetchGalleryPreview() {
  "use cache";
  cacheLife("hours");
  return listGalleryItems(6);
}

export async function GalleryStream() {
  let raw;
  try {
    raw = await fetchGalleryPreview();
  } catch (error) {
    console.error("[GalleryStream] Failed to load gallery preview", error);
    return null;
  }

  if (raw.length === 0) return null;

  const items = raw.map((g) => ({
    ...g,
    visibility: g.visibility as "public" | "private",
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));

  return <GalleryPreview items={items} />;
}
