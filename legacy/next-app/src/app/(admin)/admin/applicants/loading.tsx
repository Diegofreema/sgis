import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicantsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-border">
          <Skeleton className="h-8 w-56" />
        </div>
        {/* Rows */}
        <div className="divide-y divide-border">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-36" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
