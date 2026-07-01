import { Skeleton } from "@/components/ui/skeleton";

export const unstable_instant = true;

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
          <div className="max-w-4xl space-y-6">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
