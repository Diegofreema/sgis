/**
 * Server Component — streams in the latest news section.
 * `'use cache'` + cacheLife('hours'): articles are cached and revalidated
 * hourly so this section is served from the prerendered cache on most requests,
 * while still streaming independently from the rest of the page.
 */
import { cacheLife } from "next/cache";
import { listNewsArticles } from "@/server/queries/cms.queries";
import { NewsCard } from "@/components/public/NewsCard";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ContentStatus } from "@/constants/statuses";

async function fetchLatestNews() {
  "use cache";
  cacheLife("hours");
  return listNewsArticles("published", 3);
}

export async function NewsStream() {
  let raw;
  try {
    raw = await fetchLatestNews();
  } catch (error) {
    console.error("[NewsStream] Failed to load latest news", error);
    return null;
  }

  if (raw.length === 0) return null;

  const articles = raw.map((a) => ({
    ...a,
    status: a.status as ContentStatus,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

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
