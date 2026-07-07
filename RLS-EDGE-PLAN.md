# RLS + Edge Function plan — Admin & Entrance-exam in the browser SPA

How the server-only features reach the Vite SPA under the **supabase-js from
browser** strategy. Two mechanisms:

- **RLS** — direct `supabase-js` reads/writes, gated by Postgres Row-Level
  Security. Used for anything a *trusted authenticated admin* or the *public*
  may do directly.
- **Edge Functions** — Deno functions running with the **service role** (which
  bypasses RLS). Used for everything that must stay off the client: exam-answer
  secrecy, OTP hashing/rate-limiting, grading, and server-side file validation.

> Status: code is written and static-checked, **not yet deployed**. Applying
> RLS to production and deploying functions needs your action — see Runbook.

## Why the split

The hard boundary is `questions.correct_option` — schema-commented "NEVER expose
in student-facing queries" — plus the scrypt OTP flow (`public_exam_access_sessions`)
and grading. RLS is row-level; it can't cleanly hide one column or run the
procedural OTP/grading logic. So the entrance-exam is **Edge Functions**. Admin
is CRUD a trusted admin is authorized for → mostly **RLS**.

## RLS matrix

`public.is_admin()` = `exists(profiles where auth_user_id = auth.uid() and role='admin')`
(SECURITY DEFINER, so the check itself isn't subject to profiles RLS).

| Table | anon/authenticated | admin | Notes |
|-------|--------------------|-------|-------|
| news_articles | SELECT `status='published'` | ALL | |
| gallery_items | SELECT `visibility='public'` | ALL | |
| announcements | SELECT published+public | ALL | |
| application_periods | SELECT `status='open'` | ALL | |
| admission_settings | SELECT all (public-safe) | ALL | fixes SPA anon 42501 |
| bank_accounts | SELECT `is_active` | ALL | payment instructions |
| cms_pages, carousel_slides | — | ALL | |
| applications | — | ALL | created via Edge Fn |
| payments | — | ALL | |
| profiles | — | ALL | |
| activity_logs | — | ALL | |
| **exams, questions, exam_questions, exam_attempts, exam_answers, public_exam_access_sessions** | **NONE** | ALL | **exam secrecy — students reach these only via Edge Functions** |

Storage (`storage.objects`): `gallery` public-read / admin-write; `documents`
public-insert (applicants) / admin-read+delete; `avatars` public-read /
authenticated-write. File uploads already run through the anon client in legacy,
so this only formalises the policies.

Migration: [`supabase/migrations/20260707000000_spa_browser_rls.sql`](supabase/migrations/20260707000000_spa_browser_rls.sql)
— idempotent, additive (service-role legacy queries are unaffected).

## Edge Function API

All under `/functions/v1/`, `verify_jwt = false` (applicants are anonymous),
service role. SPA client: [`src/lib/edge.ts`](src/lib/edge.ts).

| Function | Replaces (legacy) | Body → result | Security invariant |
|----------|-------------------|---------------|--------------------|
| `exam-access-request` | `requestPublicExamAccess` | `{periodId, applicationCode, email}` → `{accessSessionId, maskedEmail, expiresAt}` | approved-application check; scrypt OTP; 60s resend cooldown; emails code |
| `exam-access-verify` | `verifyPublicExamAccess` | `{accessSessionId, code}` → `{token, redirectTo}` | timing-safe compare; ≤5 attempts; expiry; mints session token (revocable) |
| `exam-start` | `startPublicExamAttempt` + `getExamForStudent` | `{token}` → `{attemptId, exam, questions, expiresAt}` | validates session; **questions stripped of `correct_option`/`explanation`**; shuffled order |
| `exam-submit` | `submitExam` | `{token, attemptId, answers[]}` → ok | grades against secret `correct_option`; writes score; idempotent |
| `submit-application` | `createPublicApplication` | multipart form + files → `{applicationCode}` | open-period + dedupe; **server-side magic-byte + size file validation**; service-role upload+insert; receipt email |

Session model: `exam-access-verify` returns a `token` (the verified access
session id) that the SPA sends to `exam-start`/`exam-submit`. Same trust model as
the legacy httpOnly cookie (random id, server-validated, short-lived, revocable),
but works cross-origin to the functions host.

Shared modules ([`supabase/functions/_shared/`](supabase/functions/_shared/)):
`otp.ts` (scrypt via `node:crypto`, ported verbatim), `exam-window.ts` (phase
logic + shuffle), `session.ts` (token → application/period/exam + assigned
questions), `email.ts` (Resend), `client.ts` (service client), `cors.ts`.

## Admin panel

No new backend needed beyond RLS. Once admin UI routes are migrated, they use
`supabase-js` directly (as an authenticated admin) for CRUD — all gated by the
`admin_all_*` policies. The exceptions that still need a function/service role:

- **Creating admin auth users / setting roles** → Supabase Auth Admin API
  (service role). Add an `admin-create-user` function or keep `scripts/create-admin.mjs`.
- **Applicant notification emails** (approve/reject) → reuse `_shared/email.ts`
  in a small `admin-notify` function, or Supabase Auth emails.
- **XLSX question bulk upload** → parse client-side (`xlsx` is already a dep),
  insert via admin RLS.

Admin *UI pages* are not migrated yet — they consume this layer and follow the
same page-migration pattern already used for the public/auth routes.

## Runbook (deploy — needs your Supabase access)

```bash
supabase login                                  # needs your access token
supabase link --project-ref lrryoatpjiczimjqdetw

# 1) RLS + storage policies  (review first! test on a staging project)
supabase db push                                # applies supabase/migrations/*

# 2) Edge Functions
supabase functions deploy exam-access-request exam-access-verify \
  exam-start exam-submit submit-application

# 3) Function secrets
supabase secrets set RESEND_API_KEY=... SMTP_FROM_EMAIL=... SMTP_FROM_NAME="Sankt Georg International School" \
  STORAGE_BUCKET_DOCUMENTS=documents
# (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically)
```

Then set the SPA env (`.env`): `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
are already used by `supabase.functions.invoke`.

## Verification status / risks

- **Not deployed / not runtime-tested.** I can't deploy functions (no Supabase
  access token) or apply RLS to prod (correctly gated). SQL is idempotent and
  reviewable; functions are static-checkable with `deno check`.
- OTP + grading logic is a **faithful port** of the legacy server code, but
  security/exam-integrity code — **review + test on staging before prod.**
- `submit-application` magic-byte validation is a subset of legacy
  `detectUploadType`; extend `detectType()` if you accept more formats.
- Storage bucket ids in the SQL/functions (`gallery`, `documents`, `avatars`)
  must match your actual buckets / `NEXT_PUBLIC_STORAGE_BUCKET_*` values.
- Tighten `Access-Control-Allow-Origin` in `_shared/cors.ts` to your SPA origin.
