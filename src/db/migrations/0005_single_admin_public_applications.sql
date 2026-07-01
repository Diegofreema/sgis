ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'pending';

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
