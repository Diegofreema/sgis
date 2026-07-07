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
--> statement-breakpoint
ALTER TABLE "public_exam_access_sessions" ADD CONSTRAINT "public_exam_access_sessions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_exam_access_sessions" ADD CONSTRAINT "public_exam_access_sessions_application_period_id_application_periods_id_fk" FOREIGN KEY ("application_period_id") REFERENCES "public"."application_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_exam_access_sessions" ADD CONSTRAINT "public_exam_access_sessions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "public_exam_access_sessions_application_exam_idx" ON "public_exam_access_sessions" USING btree ("application_id","exam_id");--> statement-breakpoint
CREATE INDEX "public_exam_access_sessions_exam_expiry_idx" ON "public_exam_access_sessions" USING btree ("exam_id","session_expires_at");--> statement-breakpoint
CREATE INDEX "public_exam_access_sessions_application_period_idx" ON "public_exam_access_sessions" USING btree ("application_period_id");--> statement-breakpoint
ALTER TABLE "public"."public_exam_access_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "public_exam_access_sessions_server_only"
ON "public"."public_exam_access_sessions"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
