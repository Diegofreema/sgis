import { db, cmsPages, newsArticles, galleryItems, announcements } from "@/db";
import { eq, and, desc } from "drizzle-orm";

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

export async function listPublicAnnouncements(limit = 10) {
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "published"),
        eq(announcements.audience, "public")
      )
    )
    .orderBy(desc(announcements.publishedAt))
    .limit(limit);
}

export async function listGalleryItems(limit = 20) {
  if (!db) return [];
  return db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.visibility, "public"))
    .orderBy(galleryItems.sortOrder)
    .limit(limit);
}

export async function listAllAnnouncements() {
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}
