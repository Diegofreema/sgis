import { Skeleton } from "@/components/ui/skeleton";

export default function EntranceExamLoading() {
  return (
    <div>
      <section className="pt-28 pb-16 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-5 w-full max-w-xl" />
          <Skeleton className="h-5 w-3/4 max-w-xl mt-2" />
        </div>
      </section>
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-40 w-full max-w-2xl rounded-2xl" />
        </div>
      </section>
    </div>
  );
}
