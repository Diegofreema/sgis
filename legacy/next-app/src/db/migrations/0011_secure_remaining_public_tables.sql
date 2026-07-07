ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."admission_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."exam_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE "public"."bank_accounts" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "public"."admission_settings" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "public"."activity_logs" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "public"."exam_questions" FROM anon, authenticated;--> statement-breakpoint

CREATE POLICY "bank_accounts_server_only"
ON "public"."bank_accounts"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);--> statement-breakpoint

CREATE POLICY "admission_settings_server_only"
ON "public"."admission_settings"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);--> statement-breakpoint

CREATE POLICY "activity_logs_server_only"
ON "public"."activity_logs"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);--> statement-breakpoint

CREATE POLICY "exam_questions_server_only"
ON "public"."exam_questions"
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
