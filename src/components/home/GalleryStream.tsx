import { useEffect, useState } from "react";
import { listGalleryItems } from "@/lib/queries";
import { GalleryPreview } from "@/components/public/GalleryPreview";
import { Skeleton } from "@/components/ui/skeleton";
import type { GalleryItem } from "@/types/cms";

function GallerySkeleton() {
  return (
    <section className="section-padding bg-muted/20">
      <div className="container mx-auto container-padding">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Client stream — first 6 gallery items. */
export function GalleryStream() {
  const [items, setItems] = useState<GalleryItem[] | null>(null);

  useEffect(() => {
    let active = true;
    listGalleryItems(6)
      .then((g) => active && setItems(g))
      .catch((error) => {
        console.error("[GalleryStream]", error);
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (items === null) return <GallerySkeleton />;
  if (items.length === 0) return null;

  return <GalleryPreview items={items} />;
}
