import { useEffect, useState } from "react";
import { listNewsArticles } from "@/lib/queries";
import { NewsCard } from "@/components/public/NewsCard";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "@/lib/compat/link";
import { ArrowRight } from "lucide-react";
import type { NewsArticle } from "@/types/cms";

function NewsSkeleton() {
  return (
    <section className="section-padding">
      <div className="container mx-auto container-padding">
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Client stream — latest 3 published news articles. */
export function NewsStream() {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);

  useEffect(() => {
    let active = true;
    listNewsArticles("published", 3)
      .then((a) => active && setArticles(a))
      .catch((error) => {
        console.error("[NewsStream]", error);
        if (active) setArticles([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (articles === null) return <NewsSkeleton />;
  if (articles.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container mx-auto container-padding">
        <FadeIn>
          <div className="flex items-end justify-between mb-10">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary uppercase tracking-wider">
                Latest News
              </p>
              <h2 className="text-h2 font-serif font-bold text-foreground">
                From Our School
              </h2>
            </div>
            <Button asChild variant="ghost" className="gap-2 text-primary hover:text-primary">
              <Link href="/news">
                View All News <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </FadeIn>

        <StaggerChildren className="grid md:grid-cols-3 gap-6">
          {articles.map((article) => (
            <StaggerItem key={article.id}>
              <NewsCard article={article} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
