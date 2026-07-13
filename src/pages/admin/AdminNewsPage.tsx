import { useCallback, useEffect, useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { NewsAdminClient } from "@/components/admin/NewsAdminClient";
import { listAllNewsArticles } from "@/lib/admin";
import type { NewsArticle } from "@/types/cms";

export function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);

  const load = useCallback(() => {
    listAllNewsArticles()
      .then(setArticles)
      .catch((e) => console.error("[admin-news]", e));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!articles) return <AdminLoading />;

  return (
    <FadeIn>
      <NewsAdminClient articles={articles} onChanged={load} />
    </FadeIn>
  );
}
