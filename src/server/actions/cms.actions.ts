"use server";

import { z } from "zod";
import { db, cmsPages, newsArticles, announcements, galleryItems } from "@/db";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import slugify from "slugify";
import { nanoid } from "nanoid";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function upsertCMSPage(input: {
  pageKey: string;
  title: string;
  body?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: "draft" | "published" | "archived";
}): Promise<ActionResult> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .insert(cmsPages)
    .values({
      pageKey: input.pageKey,
      title: input.title,
      body: input.body,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      status: input.status ?? "draft",
      updatedBy: admin.id,
    })
    .onConflictDoUpdate({
      target: cmsPages.pageKey,
      set: {
        title: input.title,
        body: input.body,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        status: input.status ?? "draft",
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

  return { success: true, data: undefined };
}

export async function createNewsArticle(input: {
  title: string;
  excerpt?: string;
  body?: string;
  featuredImageUrl?: string;
  author?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: "draft" | "published";
}): Promise<ActionResult<{ id: string; slug: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const slug =
    slugify(input.title, { lower: true, strict: true }) + "-" + nanoid(6);

  const [article] = await db
    .insert(newsArticles)
    .values({
      title: input.title,
      slug,
      excerpt: input.excerpt,
      body: input.body,
      featuredImageUrl: input.featuredImageUrl,
      author: input.author,
      status: input.status ?? "draft",
      publishedAt: input.status === "published" ? new Date() : null,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      createdBy: admin.id,
    })
    .returning({ id: newsArticles.id, slug: newsArticles.slug });

  return { success: true, data: { id: article.id, slug: article.slug } };
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  excerpt?: string;
  audience?: "public" | "students" | "parents" | "applicants" | "admins";
  isImportant?: boolean;
  status?: "draft" | "published";
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  const slug =
    slugify(input.title, { lower: true, strict: true }) + "-" + nanoid(6);

  const [ann] = await db
    .insert(announcements)
    .values({
      title: input.title,
      slug,
      body: input.body,
      excerpt: input.excerpt,
      audience: input.audience ?? "public",
      isImportant: input.isImportant ?? false,
      status: input.status ?? "draft",
      publishedAt: input.status === "published" ? new Date() : null,
      createdBy: admin.id,
    })
    .returning({ id: announcements.id });

  return { success: true, data: { id: ann.id } };
}

export async function updateAnnouncementStatus(
  id: string,
  status: "draft" | "published" | "archived"
): Promise<ActionResult> {
  await requireRole(["admin"]);
  if (!db) return { success: false, error: "Service unavailable" };

  await db
    .update(announcements)
    .set({
      status,
      publishedAt: status === "published" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id));

  return { success: true, data: undefined };
}
