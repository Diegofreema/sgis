ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."application_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."carousel_slides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cms_pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exam_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exam_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gallery_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_public_read"
ON "public"."announcements"
FOR SELECT
TO anon, authenticated
USING (
  "status" = 'published'
  AND "audience" = 'public'
);

CREATE POLICY "cms_pages_public_read"
ON "public"."cms_pages"
FOR SELECT
TO anon, authenticated
USING ("status" = 'published');

CREATE POLICY "carousel_slides_public_read"
ON "public"."carousel_slides"
FOR SELECT
TO anon, authenticated
USING ("is_active" = true);

CREATE POLICY "gallery_items_public_read"
ON "public"."gallery_items"
FOR SELECT
TO anon, authenticated
USING ("visibility" = 'public');

CREATE POLICY "news_articles_public_read"
ON "public"."news_articles"
FOR SELECT
TO anon, authenticated
USING ("status" = 'published');
