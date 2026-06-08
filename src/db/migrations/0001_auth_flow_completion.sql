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
