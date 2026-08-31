-- Base schema (part 3/3): recovered from legacy Drizzle migrations 0005 and
-- 0007-0012 (git 6e0be2e). Enum values used here were added in part 2.

-- ── legacy 0005_single_admin_public_applications.sql (minus ADD VALUE, in part 2) ──
ALTER TABLE "applications" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "exam_attempts" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "application_code" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "date_of_birth" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "lga" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "passport_photo_url" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "passport_photo_path" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "receipt_url" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "receipt_path" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "payment_reference" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "payment_note" text;

UPDATE "applications" a
SET
  "application_code" = COALESCE(a."application_code", 'SGIS-' || upper(substr(replace(a."id"::text, '-', ''), 1, 10))),
  "first_name" = COALESCE(a."first_name", p."first_name", 'Applicant'),
  "last_name" = COALESCE(a."last_name", p."last_name", 'Record'),
  "email" = COALESCE(a."email", p."email", a."guardian_email", 'unknown-' || a."id"::text || '@example.invalid'),
  "phone" = COALESCE(a."phone", p."phone", a."guardian_phone", 'Not provided'),
  "date_of_birth" = COALESCE(a."date_of_birth", p."date_of_birth", 'Not provided'),
  "gender" = COALESCE(a."gender", p."gender"::text, 'Not provided'),
  "address" = COALESCE(a."address", p."address", 'Not provided'),
  "state" = COALESCE(a."state", p."state"),
  "lga" = COALESCE(a."lga", p."lga"),
  "previous_school" = COALESCE(a."previous_school", p."previous_school"),
  "guardian_name" = COALESCE(a."guardian_name", p."guardian_name"),
  "guardian_phone" = COALESCE(a."guardian_phone", p."guardian_phone"),
  "guardian_email" = COALESCE(a."guardian_email", p."guardian_email")
FROM "profiles" p
WHERE a."user_id" = p."id";

UPDATE "applications"
SET "application_code" = COALESCE("application_code", 'SGIS-' || upper(substr(replace("id"::text, '-', ''), 1, 10))),
    "first_name" = COALESCE("first_name", 'Applicant'),
    "last_name" = COALESCE("last_name", 'Record'),
    "email" = COALESCE("email", "guardian_email", 'unknown-' || "id"::text || '@example.invalid'),
    "phone" = COALESCE("phone", "guardian_phone", 'Not provided'),
    "date_of_birth" = COALESCE("date_of_birth", 'Not provided'),
    "gender" = COALESCE("gender", 'Not provided'),
    "address" = COALESCE("address", 'Not provided')
WHERE "application_code" IS NULL
   OR "first_name" IS NULL
   OR "last_name" IS NULL
   OR "email" IS NULL
   OR "phone" IS NULL
   OR "date_of_birth" IS NULL
   OR "gender" IS NULL
   OR "address" IS NULL;

UPDATE "applications"
SET "status" = 'pending'
WHERE "status" IN ('draft', 'pending_payment', 'submitted', 'under_review');

ALTER TABLE "applications" ALTER COLUMN "application_code" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "last_name" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "date_of_birth" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "gender" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "address" SET NOT NULL;
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS "applications_application_code_idx" ON "applications" ("application_code");
CREATE INDEX IF NOT EXISTS "applications_email_idx" ON "applications" ("email");
CREATE INDEX IF NOT EXISTS "applications_period_idx" ON "applications" ("application_period_id");
CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications" ("status");

-- ── legacy 0007_sticky_legion.sql ──
ALTER TABLE "admission_settings" ADD COLUMN "school_name" text DEFAULT 'Sankt Georg International School' NOT NULL;
ALTER TABLE "admission_settings" ADD COLUMN "school_email" text;
ALTER TABLE "admission_settings" ADD COLUMN "school_phone" text;
ALTER TABLE "admission_settings" ADD COLUMN "maintenance_mode" boolean DEFAULT false NOT NULL;

-- ── legacy 0008_wonderful_ben_urich.sql ──
CREATE TABLE "exam_questions" (
	"exam_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_questions_exam_id_question_id_pk" PRIMARY KEY("exam_id","question_id")
);
ALTER TABLE "questions" ALTER COLUMN "exam_id" DROP NOT NULL;
ALTER TABLE "exam_attempts" ADD COLUMN "question_order" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "exam_attempts" ADD COLUMN "passed" boolean;
INSERT INTO "exam_questions" ("exam_id", "question_id", "sort_order", "created_at")
SELECT "exam_id", "id", "sort_order", "created_at"
FROM "questions"
WHERE "exam_id" IS NOT NULL
ON CONFLICT DO NOTHING;
UPDATE "exams" AS "exam"
SET "total_marks" = COALESCE("assigned"."total_marks", 0)
FROM (
	SELECT
		"exam_questions"."exam_id" AS "exam_id",
		ROUND(SUM(("questions"."marks")::numeric))::integer AS "total_marks"
	FROM "exam_questions"
	INNER JOIN "questions" ON "questions"."id" = "exam_questions"."question_id"
	GROUP BY "exam_questions"."exam_id"
) AS "assigned"
WHERE "exam"."id" = "assigned"."exam_id";
UPDATE "exam_attempts" AS "attempt"
SET "question_order" = "ordered"."question_order"
FROM (
	SELECT
		"exam_questions"."exam_id" AS "exam_id",
		jsonb_agg("exam_questions"."question_id" ORDER BY "exam_questions"."sort_order") AS "question_order"
	FROM "exam_questions"
	GROUP BY "exam_questions"."exam_id"
) AS "ordered"
WHERE "attempt"."exam_id" = "ordered"."exam_id"
  AND "attempt"."question_order" = '[]'::jsonb;
UPDATE "exam_attempts" AS "attempt"
SET "passed" = CASE
	WHEN "attempt"."score" IS NULL THEN NULL
	WHEN ("attempt"."score")::numeric >= (((COALESCE("attempt"."total_marks", "exam"."total_marks"))::numeric * "exam"."passing_score"::numeric) / 100.0) THEN true
	ELSE false
END
FROM "exams" AS "exam"
WHERE "exam"."id" = "attempt"."exam_id";
DELETE FROM "exam_attempts" AS "older"
USING "exam_attempts" AS "newer"
WHERE "older"."application_id" = "newer"."application_id"
  AND "older"."exam_id" = "newer"."exam_id"
  AND (
    "older"."created_at" < "newer"."created_at"
    OR (
      "older"."created_at" = "newer"."created_at"
      AND "older"."id" < "newer"."id"
    )
  );
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "exam_questions_exam_idx" ON "exam_questions" USING btree ("exam_id");
CREATE INDEX "exam_questions_question_idx" ON "exam_questions" USING btree ("question_id");
CREATE UNIQUE INDEX "exam_attempts_application_exam_idx" ON "exam_attempts" USING btree ("application_id","exam_id");

-- ── legacy 0009_thin_puff_adder.sql ──
CREATE TABLE "public_exam_access_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"application_period_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"code_salt" text NOT NULL,
	"code_expires_at" timestamp with time zone NOT NULL,
	"code_attempt_count" integer DEFAULT 0 NOT NULL,
	"verified_at" timestamp with time zone,
	"session_expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public_exam_access_sessions" ADD CONSTRAINT "public_exam_access_sessions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "public_exam_access_sessions" ADD CONSTRAINT "public_exam_access_sessions_application_period_id_application_periods_id_fk" FOREIGN KEY ("application_period_id") REFERENCES "public"."application_periods"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "public_exam_access_sessions" ADD CONSTRAINT "public_exam_access_sessions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "public_exam_access_sessions_application_exam_idx" ON "public_exam_access_sessions" USING btree ("application_id","exam_id");
CREATE INDEX "public_exam_access_sessions_exam_expiry_idx" ON "public_exam_access_sessions" USING btree ("exam_id","session_expires_at");
CREATE INDEX "public_exam_access_sessions_application_period_idx" ON "public_exam_access_sessions" USING btree ("application_period_id");
ALTER TABLE "public"."public_exam_access_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_exam_access_sessions_server_only"
ON "public"."public_exam_access_sessions"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- ── legacy 0010_admin_only_roles.sql ──
ALTER TABLE "activity_logs" ALTER COLUMN "actor_role" DROP DEFAULT;
ALTER TABLE "profiles" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "activity_logs" ALTER COLUMN "actor_role" SET DATA TYPE text;
ALTER TABLE "profiles" ALTER COLUMN "role" SET DATA TYPE text;

UPDATE "activity_logs"
SET "actor_role" = 'admin'
WHERE "actor_role" IS NOT NULL
  AND "actor_role" <> 'admin';

UPDATE "profiles"
SET "role" = 'admin'
WHERE "role" <> 'admin';

DROP TYPE "public"."user_role";

CREATE TYPE "public"."user_role" AS ENUM('admin');

ALTER TABLE "activity_logs"
  ALTER COLUMN "actor_role" SET DATA TYPE "public"."user_role"
  USING ("actor_role"::"public"."user_role");

ALTER TABLE "profiles"
  ALTER COLUMN "role" SET DATA TYPE "public"."user_role"
  USING ("role"::"public"."user_role");

ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'admin';

-- ── legacy 0011_secure_remaining_public_tables.sql ──
ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."admission_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exam_questions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE "public"."bank_accounts" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "public"."admission_settings" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "public"."activity_logs" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "public"."exam_questions" FROM anon, authenticated;

CREATE POLICY "bank_accounts_server_only"
ON "public"."bank_accounts"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "admission_settings_server_only"
ON "public"."admission_settings"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "activity_logs_server_only"
ON "public"."activity_logs"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "exam_questions_server_only"
ON "public"."exam_questions"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- ── legacy 0012_gallery_storage_policy.sql ──
-- NOTE: These policies hardcode bucket_id = 'gallery'. If the bucket name
-- is customized, this migration must be regenerated with the matching name.
CREATE POLICY "gallery_insert_authenticated"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "gallery_delete_authenticated"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'gallery');

CREATE POLICY "gallery_select_public"
ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'gallery');
