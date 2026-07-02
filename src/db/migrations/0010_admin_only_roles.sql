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
