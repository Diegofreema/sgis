import Image from '@/lib/compat/image';
import Link from '@/lib/compat/link';
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";
import type { GalleryItem } from "@/types/cms";

type GalleryPreviewProps = {
  items: GalleryItem[];
};

export function GalleryPreview({ items }: GalleryPreviewProps) {
  const displayItems = items.slice(0, 6);

  return (
    <section className="section-padding bg-muted/20">
      <div className="container mx-auto container-padding">
        <FadeIn>
          <div className="flex items-end justify-between mb-10">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary uppercase tracking-wider">
                Campus Life
              </p>
              <h2 className="text-h2 font-serif font-bold text-foreground">
                A Glimpse Inside
              </h2>
            </div>
            <Button asChild variant="ghost" className="gap-2 text-primary hover:text-primary">
              <Link href="/gallery">
                View Gallery <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </FadeIn>

        {displayItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {displayItems.map((item, i) => (
              <FadeIn key={item.id} delay={i * 0.05}>
                <Link href="/gallery" className="group block">
                  <div
                    className={`relative overflow-hidden rounded-xl bg-muted ${
                      i === 0 ? "row-span-2 aspect-3/4" : "aspect-square"
                    }`}
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300 rounded-xl" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-linear-to-t from-foreground/60 to-transparent rounded-b-xl">
                      <p className="text-xs text-white font-medium line-clamp-1">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        ) : (
          // Placeholder grid when no gallery items yet
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-xl bg-muted animate-pulse ${
                  i === 0 ? "row-span-2 aspect-3/4" : "aspect-square"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
