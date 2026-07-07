import Link from '@/lib/compat/link';
import Image from '@/lib/compat/image';
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, truncate } from "@/lib/utils";
import type { NewsArticle } from "@/types/cms";

type NewsCardProps = {
  article: NewsArticle;
  featured?: boolean;
};

export function NewsCard({ article, featured = false }: NewsCardProps) {
  return (
    <Link href={`/news/${article.slug}`} className="group block">
      <Card className="overflow-hidden border-border/60 hover:border-primary/30 hover:shadow-brand-md transition-all duration-300 h-full">
        {/* Image */}
        {article.featuredImageUrl && (
          <div className={`relative overflow-hidden bg-muted ${featured ? "h-52" : "h-40"}`}>
            <Image
              src={article.featuredImageUrl}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <time className="text-xs text-muted-foreground">
              {formatDate(article.publishedAt ?? article.createdAt)}
            </time>
          </div>

          <h3 className="font-serif font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>

          {article.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {truncate(article.excerpt, 100)}
            </p>
          )}

          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Read more <ArrowRight className="h-3 w-3" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
