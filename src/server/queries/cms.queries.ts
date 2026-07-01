import { db, cmsPages, newsArticles, galleryItems, announcements } from "@/db";
import { eq, and, desc, count } from "drizzle-orm";

export async function getCMSPage(pageKey: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.pageKey, pageKey))
    .limit(1);
  return result[0] ?? null;
}

export async function listNewsArticles(
  status: "published" | "draft" | "archived" = "published",
  limit = 20
) {
  if (!db) return [];
  return db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.status, status))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit);
}

export async function getNewsArticleBySlug(slug: string) {
  if (!db) return null;
  const result = await db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.slug, slug), eq(newsArticles.status, "published")))
    .limit(1);
  return result[0] ?? null;
}

export async function getActiveAnnouncement() {
  if (!db) return null;
  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "published"),
        eq(announcements.audience, "public")
      )
    )
    .orderBy(desc(announcements.publishedAt))
    .limit(1);

  return rows[0] ?? null;
}

type ListGalleryItemsInput =
  | number
  | {
      page?: number;
      pageSize?: number;
    };

export async function countGalleryItems() {
  if (!db) throw new Error("Gallery service unavailable.");
  const result = await db.select({ count: count() }).from(galleryItems);
  return Number(result[0]?.count ?? 0);
}

export async function listGalleryItems(input: ListGalleryItemsInput = 20) {
  if (!db) throw new Error("Gallery service unavailable.");
  const page = typeof input === "number" ? 1 : Math.max(input.page ?? 1, 1);
  const pageSize = typeof input === "number" ? input : Math.max(input.pageSize ?? 20, 1);

  return db
    .select()
    .from(galleryItems)
    .orderBy(galleryItems.sortOrder, desc(galleryItems.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function listAllAnnouncements() {
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}
