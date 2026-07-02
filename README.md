# SGIS Portal

## Development

Run the app with:

```bash
pnpm dev
```

Production verification:

```bash
pnpm build
pnpm exec tsc --noEmit
pnpm verify:auth-links -- --base-url http://127.0.0.1:3000
```

## Auth Flow

The current auth model supports exactly three active roles:

- `parent`
- `student`
- `admin`

Public self-registration is parent-only. Student accounts are created by a parent from the dashboard, and admin accounts are created through a backend-only bootstrap flow.

### Parent flow

Parent self-registration is currently disabled.

- `/register` redirects to `/entrance-exam`.
- If parent signup is re-enabled later, verification and recovery emails are sent by Supabase Auth, not `src/lib/email.ts`.

### Student flow

Student self-service creation is also currently disabled.

- If this flow is re-enabled later, the app sends student credential emails through Resend via `src/lib/email.ts`.

### Password flows

- Forgot password starts at `/forgot-password`.
- Recovery links land on `/reset-password`.
- Logged-in users can change passwords from `/dashboard/profile`.
- Password reset emails are sent by Supabase Auth.

## Required Environment

Supabase and app configuration live in `.env.local`.

Required for runtime auth flows:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (must be the real service-role/admin key, not an anon or publishable key)
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

Required for app-managed email delivery (`src/lib/email.ts`):

- `RESEND_API_KEY`
- `SMTP_FROM_EMAIL`

Optional:

- `SMTP_FROM_NAME`
- `EMAIL_OUTBOX_DIR`

App-managed emails currently include:

- public application receipt
- public exam OTP / verification code
- application status updates
- exam result emails

If `RESEND_API_KEY` is missing in development, the app writes outgoing mail to `.email-outbox/` instead of sending it.

Supabase Auth emails are configured separately in Supabase:

- signup / verification emails
- resend verification emails
- forgot-password / recovery emails

Those flows use `supabase.auth.*` server actions and require correct Auth email settings plus the right site URL / redirect URL in Supabase.

## Bootstrap an Admin Account

Admin accounts are not created from the public registration page.

Use:

```bash
pnpm bootstrap:admin -- --email admin@example.com --first-name Ada --last-name Admin --password 'StrongPass123'
```

This script:

- creates the Supabase auth user as confirmed
- sets the auth app metadata role to `admin`
- inserts or updates the matching `profiles` row with role `admin`

## Apply Migrations

Run:

```bash
pnpm db:migrate
```

This applies the checked-in Drizzle SQL migrations using `DATABASE_URL`.

## Verify Email Callback Flows

Run the app locally in one terminal:

```bash
pnpm dev
```

Then, in another terminal, run:

```bash
pnpm verify:auth-links -- --base-url http://127.0.0.1:3000
```

Optional:

```bash
pnpm verify:auth-links -- --base-url http://127.0.0.1:3000 --email-domain mailinator.com
```

This smoke test uses the public auth flow plus the database-issued token hashes from `auth.one_time_tokens` to verify that:

- signup confirmation links land in the app callback
- the callback sets a session and redirects verified parents to `/dashboard`
- password recovery links land in the app callback
- recovery sessions render the `/reset-password` form

## Current Verification Status

- Auth-related changed files pass targeted ESLint checks.
- `pnpm exec tsc --noEmit` passes.
- `pnpm build` passes when the environment can fetch Google fonts during the build.
- The `sgis` Supabase project now has the auth and RLS migrations applied: `auth_flow_completion`, `enable_public_rls`, and `lock_server_only_tables`.
- Supabase security advisor is currently clean after enabling RLS on exposed public tables and explicitly locking server-only tables away from the public Data API.
- Full repo-wide `pnpm lint` still reports unrelated pre-existing issues outside the auth scope.
