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

1. A parent signs up at `/register`.
2. Supabase sends the verification email.
3. The parent completes verification through `/auth/confirm`.
4. The parent signs in and lands on `/dashboard`.

### Student flow

1. A parent creates the student from `/dashboard/students`.
2. The app creates the Supabase user as email-confirmed.
3. The app sends the temporary credentials by email.
4. The student signs in and is forced to change the temporary password before using the rest of the dashboard.

### Password flows

- Forgot password starts at `/forgot-password`.
- Recovery links land on `/reset-password`.
- Logged-in users can change passwords from `/dashboard/profile`.

## Required Environment

Supabase and app configuration live in `.env.local`.

Required for runtime auth flows:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (must be the real service-role/admin key, not an anon or publishable key)
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

Required for real student credential email delivery:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`

Optional:

- `SMTP_FROM_NAME`
- `SMTP_SECURE`
- `EMAIL_OUTBOX_DIR`

If SMTP credentials are missing in development, the app writes outgoing student credential emails to a local outbox directory instead of failing. By default that directory is `.email-outbox/`.

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
