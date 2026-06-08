import { requireRole } from "@/lib/auth";
import { db, galleryItems } from "@/db";
import { desc } from "drizzle-orm";
import { GalleryAdminClient } from "./GalleryAdminClient";

export default async function AdminGalleryPage() {
  await requireRole(["admin"]);

  const items = db
    ? await db
        .select()
        .from(galleryItems)
        .orderBy(galleryItems.sortOrder, desc(galleryItems.createdAt))
    : [];

  return <GalleryAdminClient initialItems={items} />;
}
