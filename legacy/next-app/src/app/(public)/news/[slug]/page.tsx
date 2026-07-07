/**
 * News article detail — ISR via `'use cache'` + cacheLife('hours').
 *
 * generateStaticParams pre-builds all currently published articles at
 * build time.  New articles added after deployment are generated on first
 * request and then cached (ISR fallback).
 */
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { db, newsArticles } from "@/db";
import { eq } from "drizzle-orm";
import { getNewsArticleBySlug } from "@/server/queries/cms.queries";
import Link from "next/link";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

/** Pre-build all currently published slugs at build time.
 *  cacheComponents mode requires at least one result; fall back to a
 *  placeholder that will simply 404 when requested. */
export async function generateStaticParams() {
  const FALLBACK = [{ slug: "_placeholder" }];
  if (!db) return FALLBACK;
  const rows = await db
    .select({ slug: newsArticles.slug })
    .from(newsArticles)
    .where(eq(newsArticles.status, "published"));
  return rows.length > 0 ? rows.map(({ slug }) => ({ slug })) : FALLBACK;
}

/** Cached article fetcher — revalidates hourly. */
async function fetchArticle(slug: string) {
  "use cache";
  cacheLife("hours");
  return getNewsArticleBySlug(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return { title: "Not Found | SGIS" };
  return {
    title: `${article.title} | Sankt Georg International School`,
    description: article.excerpt ?? undefined,
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) notFound();

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                {formatDate(article.publishedAt.toISOString())}
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
