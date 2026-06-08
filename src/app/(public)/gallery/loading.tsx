import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryLoading() {
  return (
    <div>
      <section className="pt-28 pb-16 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-36 mb-4" />
          <Skeleton className="h-5 w-72" />
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {[260, 380, 300, 420, 280, 350].map((h, i) => (
              <Skeleton key={i} className={`break-inside-avoid w-full rounded-xl`} style={{ height: h }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
