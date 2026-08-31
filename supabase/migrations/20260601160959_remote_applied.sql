-- Base schema (part 1/3): recovered from legacy Next.js app Drizzle migrations
-- (git 6e0be2e, legacy/next-app/src/db/migrations 0000-0004). The original
-- remote project was deleted; these files now hold the real content so the
-- repo is self-contained. Duplicate DDL between legacy 0001 and 0004 removed.

-- ── legacy 0000_lame_trauma.sql ──
CREATE TYPE "public"."announcement_audience" AS ENUM('public', 'students', 'parents', 'applicants', 'admins');
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."application_period_status" AS ENUM('upcoming', 'open', 'closed', 'archived');
CREATE TYPE "public"."application_status" AS ENUM('draft', 'pending_payment', 'submitted', 'under_review', 'approved', 'rejected');
CREATE TYPE "public"."exam_attempt_status" AS ENUM('not_started', 'in_progress', 'submitted', 'expired', 'graded');
CREATE TYPE "public"."exam_status" AS ENUM('draft', 'active', 'closed', 'archived');
CREATE TYPE "public"."question_difficulty" AS ENUM('easy', 'medium', 'hard');
CREATE TYPE "public"."question_type" AS ENUM('single_choice');
CREATE TYPE "public"."gallery_visibility" AS ENUM('public', 'private');
CREATE TYPE "public"."payment_purpose" AS ENUM('entrance_exam_registration', 'school_fees', 'admission_fee', 'other');
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'submitted', 'approved', 'rejected');
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');
CREATE TYPE "public"."user_role" AS ENUM('student', 'parent', 'admin', 'super_admin');
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text NOT NULL,
	"excerpt" text,
	"audience" "announcement_audience" DEFAULT 'public' NOT NULL,
	"is_important" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_slug_unique" UNIQUE("slug")
);
CREATE TABLE "application_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"application_start_date" timestamp with time zone NOT NULL,
	"application_end_date" timestamp with time zone NOT NULL,
	"exam_start_date" timestamp with time zone NOT NULL,
	"exam_end_date" timestamp with time zone NOT NULL,
	"registration_fee" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"eligible_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "application_period_status" DEFAULT 'upcoming' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_period_id" uuid NOT NULL,
	"intended_class" text NOT NULL,
	"previous_school" text,
	"guardian_name" text,
	"guardian_phone" text,
	"guardian_email" text,
	"document_urls" jsonb DEFAULT '[]'::jsonb,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "exam_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option" text,
	"is_correct" boolean,
	"marks_awarded" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"score" numeric(8, 2),
	"total_marks" integer,
	"status" "exam_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"sort_code" text,
	"swift_code" text,
	"routing_number" text,
	"iban" text,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "carousel_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"image_url" text,
	"cta_label" text,
	"cta_href" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" text NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"body" text,
	"seo_title" text,
	"seo_description" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_pages_page_key_unique" UNIQUE("page_key")
);
CREATE TABLE "news_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"featured_image_url" text,
	"excerpt" text,
	"body" text,
	"author" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" text,
	"seo_description" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_articles_slug_unique" UNIQUE("slug")
);
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_period_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"instructions" text,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"total_marks" integer DEFAULT 100 NOT NULL,
	"passing_score" integer DEFAULT 50 NOT NULL,
	"randomize_questions" boolean DEFAULT false NOT NULL,
	"show_result_immediately" boolean DEFAULT false NOT NULL,
	"result_release_date" timestamp with time zone,
	"status" "exam_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"question_image_url" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct_option" text NOT NULL,
	"explanation" text,
	"marks" numeric(6, 2) DEFAULT '1' NOT NULL,
	"difficulty" "question_difficulty" DEFAULT 'medium' NOT NULL,
	"subject" text,
	"type" "question_type" DEFAULT 'single_choice' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"category" text,
	"visibility" "gallery_visibility" DEFAULT 'public' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid,
	"purpose" "payment_purpose" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"reference" text NOT NULL,
	"transaction_ref" text,
	"proof_of_payment_url" text,
	"proof_note" text,
	"admin_note" text,
	"approved_by" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
CREATE TABLE "admission_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'default' NOT NULL,
	"is_open" boolean DEFAULT false NOT NULL,
	"academic_session" text DEFAULT '' NOT NULL,
	"application_deadline" timestamp with time zone,
	"notes" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admission_settings_singleton_key_unique" UNIQUE("singleton_key")
);
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"phone" text,
	"date_of_birth" text,
	"gender" "gender",
	"address" text,
	"avatar_url" text,
	"previous_school" text,
	"guardian_name" text,
	"guardian_phone" text,
	"guardian_email" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_auth_user_id_unique" UNIQUE("auth_user_id")
);
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "application_periods" ADD CONSTRAINT "application_periods_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "applications" ADD CONSTRAINT "applications_application_period_id_application_periods_id_fk" FOREIGN KEY ("application_period_id") REFERENCES "public"."application_periods"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exams" ADD CONSTRAINT "exams_application_period_id_application_periods_id_fk" FOREIGN KEY ("application_period_id") REFERENCES "public"."application_periods"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admission_settings" ADD CONSTRAINT "admission_settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "bank_accounts_is_active_idx" ON "bank_accounts" USING btree ("is_active");
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");
CREATE INDEX "payments_reference_idx" ON "payments" USING btree ("reference");
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
CREATE INDEX "payments_purpose_idx" ON "payments" USING btree ("purpose");

-- ── legacy 0001_auth_flow_completion.sql ──
ALTER TABLE "profiles" ALTER COLUMN "role" DROP DEFAULT;

UPDATE "profiles"
SET "role" = 'admin'
WHERE "role" = 'super_admin';

ALTER TYPE "public"."user_role" RENAME TO "user_role_old";

CREATE TYPE "public"."user_role" AS ENUM('student', 'parent', 'admin');

ALTER TABLE "profiles"
  ALTER COLUMN "role" TYPE "public"."user_role"
  USING ("role"::text::"public"."user_role");

ALTER TABLE "profiles"
  ALTER COLUMN "role" SET DEFAULT 'student';

DROP TYPE "public"."user_role_old";

ALTER TABLE "profiles"
  ADD COLUMN "parent_profile_id" uuid,
  ADD COLUMN "email_verified_at" timestamp with time zone,
  ADD COLUMN "requires_password_change" boolean DEFAULT false NOT NULL,
  ADD COLUMN "password_changed_at" timestamp with time zone;

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_parent_profile_id_profiles_id_fk"
  FOREIGN KEY ("parent_profile_id")
  REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

CREATE INDEX "profiles_parent_profile_id_idx" ON "profiles" USING btree ("parent_profile_id");

UPDATE "profiles"
SET "email_verified_at" = "created_at"
WHERE "role" IN ('parent', 'admin')
  AND "email_verified_at" IS NULL;

-- ── legacy 0002_enable_public_rls.sql ──
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

-- ── legacy 0003_lock_server_only_tables.sql ──
CREATE POLICY "application_periods_server_only"
ON "public"."application_periods"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "applications_server_only"
ON "public"."applications"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "exam_answers_server_only"
ON "public"."exam_answers"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "exam_attempts_server_only"
ON "public"."exam_attempts"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "exams_server_only"
ON "public"."exams"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "payments_server_only"
ON "public"."payments"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "profiles_server_only"
ON "public"."profiles"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "questions_server_only"
ON "public"."questions"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- ── legacy 0004_fast_justice.sql ──
-- (duplicate ADD COLUMN / FK / index for parent_profile_id, email_verified_at,
--  requires_password_change, password_changed_at removed — legacy 0001 above
--  already creates them)
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" "user_role",
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "activity_logs" ALTER COLUMN "actor_role" SET DATA TYPE text;
ALTER TABLE "profiles" ALTER COLUMN "role" SET DATA TYPE text;
ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'student'::text;
DROP TYPE "public"."user_role";
CREATE TYPE "public"."user_role" AS ENUM('student', 'parent', 'admin');
ALTER TABLE "activity_logs" ALTER COLUMN "actor_role" SET DATA TYPE "public"."user_role" USING "actor_role"::"public"."user_role";
ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'student'::"public"."user_role";
ALTER TABLE "profiles" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";
ALTER TABLE "profiles" ADD COLUMN "state" text;
ALTER TABLE "profiles" ADD COLUMN "lga" text;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "activity_logs_actor_id_idx" ON "activity_logs" USING btree ("actor_id");
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");
