import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import Link from "@/lib/compat/link";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFound } from "@/components/shared/NotFound";
import { getNewsArticleBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import type { NewsArticle } from "@/types/cms";

const routeApi = getRouteApi("/public/news/$slug");

export function NewsArticlePage() {
  const { slug } = routeApi.useParams();
  const [article, setArticle] = useState<NewsArticle | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setArticle(undefined);
    getNewsArticleBySlug(slug)
      .then((a) => active && setArticle(a))
      .catch((error) => {
        console.error("[NewsArticlePage]", error);
        if (active) setArticle(null);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (article === undefined) {
    return (
      <div className="section-padding">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!article) return <NotFound />;

  return (
    <div className="section-padding">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 mb-8 -ml-2 text-muted-foreground"
        >
          <Link href="/news">
            <ArrowLeft className="h-4 w-4" />
            All News
          </Link>
        </Button>

        {/* Featured image */}
        {article.featuredImageUrl && (
          <div className="aspect-video overflow-hidden rounded-2xl mb-8">
            <img
              src={article.featuredImageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <header className="mb-8 space-y-4">
          <h1 className="text-display text-foreground">{article.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {article.author && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.author}
              </span>
            )}
            {article.publishedAt && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDate(article.publishedAt)}
              </span>
            )}
          </div>

          {article.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </header>

        <hr className="border-border mb-8" />

        {/* Body */}
        {article.body ? (
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        ) : (
          <p className="text-muted-foreground text-center py-12">
            Article content coming soon.
          </p>
        )}
      </div>
    </div>
  );
}
