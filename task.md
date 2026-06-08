# SGIS Auth Flow Implementation

## Done
- Audited the existing auth, profile, dashboard, and role-based flows.
- Confirmed the current gaps around email verification, password reset/change, student provisioning, and `super_admin` cleanup.
- Reduced the active role model to `parent`, `student`, and `admin`, while normalizing legacy `super_admin` reads to `admin`.
- Added profile onboarding/linkage support in code and migration files: `parent_profile_id`, `email_verified_at`, `requires_password_change`, and `password_changed_at`.
- Implemented parent-only public signup, verify-email holding page, auth confirmation callback, forgot-password recovery redirect, reset-password page, and in-dashboard password change flow.
- Implemented parent-created student provisioning with temporary password generation, service-role Supabase user creation, linked student profile creation, SMTP email delivery wiring, and first-login password-rotation enforcement.
- Added parent-only `/dashboard/students` management UI and linked-student access across profile, application, payments, exam status, and results routes.
- Updated dashboard middleware/guards so students with temporary passwords are restricted to `/dashboard/profile` until they change it.
- Installed `nodemailer`, added a development email outbox fallback, and verified the new/changed auth-flow files with targeted ESLint plus a full `tsc --noEmit` pass.
- Added backend-only admin bootstrap and auth callback smoke-test scripts: `pnpm bootstrap:admin`, `pnpm db:migrate`, and `pnpm verify:auth-links`.
- Applied the `auth_flow_completion` migration to the live `sgis` Supabase project and confirmed the `profiles` schema plus `user_role` enum now match the code.
- Hardened the `/auth/confirm` route so it preserves auth cookies across redirects, sanitizes `next`, and supports both PKCE `code` callbacks and `token_hash` email callbacks.
- Added and applied RLS hardening migrations for the live `sgis` project: public content tables now have explicit read policies, server-only user/payment/exam tables are locked away from the public Data API, and Supabase security advisor now returns no findings.
- Verified `pnpm build` succeeds once Next.js can fetch the Google fonts during the build.
- Smoke-tested the running auth shell locally enough to confirm the new pages are serving (`/login` and `/register` returned HTTP 200 from the dev server).

## In Progress
- `pnpm verify:auth-links` has been refactored to use the public auth flow plus `auth.one_time_tokens` instead of depending on the service-role key for parent signup/recovery verification. The updated version still needs one clean live run against the local app.

## Blocked
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is currently not authorized for Supabase admin auth operations. That blocks student provisioning and `pnpm bootstrap:admin` until the correct service-role/admin key is installed.
- Real student credential email delivery still depends on SMTP environment variables being present in the target runtime. `.env.local` currently has Supabase/app keys but does not define `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, or `SMTP_FROM_EMAIL`.
- Full repo-wide `pnpm lint` still fails on pre-existing unrelated issues in `.agents/skills/*` and existing app files outside this auth task.

## Next
- Run the refactored `pnpm verify:auth-links -- --base-url http://127.0.0.1:3000 --email-domain mailinator.com` while `pnpm dev` is running to prove the parent signup verification and recovery callbacks end to end.
- Replace `SUPABASE_SERVICE_ROLE_KEY` with the project's real service-role/admin key, then live-test student provisioning and `pnpm bootstrap:admin`.
- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM_EMAIL`, then live-test parent-created student credential delivery through the real mail provider.
- Once SMTP is configured, run a full manual pass covering parent signup, login, student creation, first student login, forced password change, and parent-managed student profile/application/payment flows.
