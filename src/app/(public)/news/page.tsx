/**
 * News listing — ISR via `'use cache'` + cacheLife('hours').
 * Cached article list revalidates hourly; no full rebuild needed when
 * new articles are published (use revalidateTag('news') from a CMS action).
 */
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { NewsCard } from '@/components/public/NewsCard';
import { FadeIn } from '@/components/animations/FadeIn';
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/animations/StaggerChildren';
import { listNewsArticles } from '@/server/queries/cms.queries';
import type { ContentStatus } from '@/constants/statuses';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'News & Updates',
  description:
    'Latest news and announcements from Sankt Georg International School.',
};

/** Cached fetcher — result is memoised and revalidated every hour. */
async function fetchArticles() {
  'use cache';
  cacheLife('hours');
  return listNewsArticles('published', 20);
}
const hide = true;

export default async function NewsPage() {
  if (hide) {
    return notFound();
  }
  const articles = await fetchArticles();
  const typedArticles = articles.map((a) => ({
    ...a,
    status: a.status as ContentStatus,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-2xl">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              Stay Informed
            </p>
            <h1 className="text-h1 font-serif font-bold text-foreground mb-4">
              News & Updates
            </h1>
            <p className="text-xl text-muted-foreground">
              The latest from our school community, campus life, and events.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          {typedArticles.length > 0 ? (
            <StaggerChildren className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {typedArticles.map((article) => (
                <StaggerItem key={article.id}>
                  <NewsCard article={article} />
                </StaggerItem>
              ))}
            </StaggerChildren>
          ) : (
            <FadeIn className="text-center py-20">
              <p className="text-muted-foreground">
                No news articles published yet.
              </p>
            </FadeIn>
          )}
        </div>
      </section>
    </>
  );
}
