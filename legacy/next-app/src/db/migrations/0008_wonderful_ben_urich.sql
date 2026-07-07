CREATE TABLE "exam_questions" (
	"exam_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_questions_exam_id_question_id_pk" PRIMARY KEY("exam_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "exam_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD COLUMN "question_order" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD COLUMN "passed" boolean;--> statement-breakpoint
INSERT INTO "exam_questions" ("exam_id", "question_id", "sort_order", "created_at")
SELECT "exam_id", "id", "sort_order", "created_at"
FROM "questions"
WHERE "exam_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
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
WHERE "exam"."id" = "assigned"."exam_id";--> statement-breakpoint
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
  AND "attempt"."question_order" = '[]'::jsonb;--> statement-breakpoint
UPDATE "exam_attempts" AS "attempt"
SET "passed" = CASE
	WHEN "attempt"."score" IS NULL THEN NULL
	WHEN ("attempt"."score")::numeric >= (((COALESCE("attempt"."total_marks", "exam"."total_marks"))::numeric * "exam"."passing_score"::numeric) / 100.0) THEN true
	ELSE false
END
FROM "exams" AS "exam"
WHERE "exam"."id" = "attempt"."exam_id";--> statement-breakpoint
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
  );--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_questions_exam_idx" ON "exam_questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_questions_question_idx" ON "exam_questions" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempts_application_exam_idx" ON "exam_attempts" USING btree ("application_id","exam_id");
