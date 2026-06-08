/**
 * Gallery page — ISR via `'use cache'` + cacheLife('hours').
 * Gallery items are cached and revalidated hourly; new photos appear
 * without a full rebuild (trigger revalidateTag('gallery') from the admin).
 */
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { listGalleryItems } from "@/server/queries/cms.queries";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from life at Sankt Georg International School.",
};

async function fetchGalleryItems() {
  "use cache";
  cacheLife("hours");
  return listGalleryItems(50);
}

export default async function GalleryPage() {
  const items = await fetchGalleryItems();

  return (
    <>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-2xl">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Campus Life</p>
            <h1 className="text-h1 font-serif font-bold text-foreground mb-4">Our Gallery</h1>
            <p className="text-xl text-muted-foreground">
              A visual tour of campus life, events, and learning at Sankt Georg.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          {items.length > 0 ? (
            <StaggerChildren className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {items.map((item) => (
                <StaggerItem key={item.id}>
                  <div className="break-inside-avoid rounded-xl overflow-hidden bg-muted group">
                    <div className="relative">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        width={600}
                        height={400}
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
                    </div>
                    {item.title && (
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerChildren>
          ) : (
            <FadeIn className="text-center py-20">
              <p className="text-muted-foreground">Gallery coming soon.</p>
            </FadeIn>
          )}
        </div>
      </section>
    </>
  );
}
