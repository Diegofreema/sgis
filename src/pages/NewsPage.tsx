import { useEffect, useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { NewsCard } from "@/components/public/NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { listNewsArticles } from "@/lib/queries";
import type { NewsArticle } from "@/types/cms";

function NewsListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <Skeleton className="h-40 w-full" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);

  useEffect(() => {
    let active = true;
    listNewsArticles("published", 50)
      .then((items) => active && setArticles(items))
      .catch((error) => {
        console.error("[NewsPage]", error);
        if (active) setArticles([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
              School News
            </p>
            <h1 className="mb-4 font-serif text-h1 font-bold text-foreground">
              Latest News
            </h1>
            <p className="text-xl text-muted-foreground">
              Updates, events, and stories from Sankt Georg International School.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          {articles === null ? (
            <NewsListSkeleton />
          ) : articles.length > 0 ? (
            <FadeIn className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article, index) => (
                <NewsCard key={article.id} article={article} featured={index === 0} />
              ))}
            </FadeIn>
          ) : (
            <FadeIn className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-20 text-center">
              <div className="mx-auto max-w-md space-y-3">
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  No news yet
                </h2>
                <p className="text-muted-foreground">
                  Published school news will appear here.
                </p>
              </div>
            </FadeIn>
          )}
        </div>
      </section>
    </>
  );
}
