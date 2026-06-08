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
