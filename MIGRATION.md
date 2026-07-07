# Next.js → React + Vite + TanStack Router migration

The original Next.js app is preserved untouched in [`legacy/next-app/`](legacy/next-app/).
The new Vite + React + TypeScript app lives at the repo root and uses TanStack
Router (code-based routes). URL paths are unchanged.

## Backend strategy

Chosen: **supabase-js from the browser**. Data/auth go through the anon
Supabase client and are governed by Postgres RLS. Anything that needs the
service role, a direct Postgres/Drizzle connection, server-side file handling,
email, or a server-only security boundary (e.g. exam answer secrecy) **cannot**
move into a browser SPA and stays legacy-only. Those are listed below.

## Migrated routes (working, verified in browser)

| Path | Source (legacy) | Data |
|------|-----------------|------|
| `/` | `app/(public)/page.tsx` | announcements / news / gallery / periods via anon RLS |
| `/about` | `app/(public)/about/page.tsx` | static |
| `/admissions` | `app/(public)/admissions/page.tsx` | static |
| `/contact` | `app/(public)/contact/page.tsx` | school settings (falls back to siteConfig) |
| `/gallery` | `app/(public)/gallery/page.tsx` | gallery items (paginated, read-only) |
| `/news/$slug` | `app/(public)/news/[slug]/page.tsx` | article via anon RLS |
| `/news` | — | **intentionally 404** (legacy `hide = true`); no route defined |
| `/login` | `app/(auth)/login` | `supabase.auth.signInWithPassword` + admin-only gate |
| `/forgot-password` | `app/(auth)/forgot-password` | `supabase.auth.resetPasswordForEmail` |
| `/register` | `app/(auth)/register` | redirects to `/entrance-exam` (legacy) |
| `/verify-email` | `app/(account)/verify-email` | `supabase.auth.resend` |
| `/reset-password` | `app/(account)/reset-password` | `supabase.auth.updateUser` |
| 404 / errors | `app/not-found.tsx`, `app/error.tsx`, `gallery/error.tsx` | router not-found / error components |

Auth/account layouts (`app/(auth)/layout.tsx`, `app/(account)/layout.tsx`) →
shared `AuthShell`. The (auth) redirect-if-authed guard is a route `beforeLoad`.
Login preserves the legacy **admin-only** gate (non-admin/profile-less accounts
are signed back out). Server-only extras (activity audit log, mark-verified DB
write) are omitted — they need service-role/DB access.

Public layout (`app/(public)/layout.tsx`) → `PublicLayout` (pathless route
`public`). Root layout (`app/layout.tsx`) → `routes/__root.tsx` (ThemeProvider +
Toaster). Reused verbatim (via compat shims): hero carousel, navbar, footer,
news/gallery cards, animations, all `components/ui`, `globals.css`
(Tailwind v4 + shadcn base-nova), site config, hooks, types, constants.

### Next → TanStack mapping

- `next/link` → `src/lib/compat/link.tsx` (maps `href`, splits `?query` into `search`)
- `next/image` → `src/lib/compat/image.tsx` (plain `<img>`, `fill`/`priority`)
- `next/navigation` (`usePathname`/`useRouter`/`useSearchParams`) → `src/lib/compat/navigation.ts`
- server queries → `src/lib/queries.ts` (supabase-js, snake_case→camelCase aliases)
- `getCurrentProfile` / `logout` / middleware auth → `src/lib/auth.ts` (client)
- `NEXT_PUBLIC_*` env → `VITE_*` (`.env`)

## Admin panel + entrance-exam — MIGRATED (via RLS + Edge Functions, deployed)

The full backend contract is live on the Supabase project (see
[RLS-EDGE-PLAN.md](RLS-EDGE-PLAN.md)) and the UI is migrated:

- **Admin** (all 7 sidebar sections): dashboard, applicants, examinations
  (+ detail + results), question bank (+ bulk XLSX upload), announcements,
  gallery, users, settings (admission settings / periods / bank accounts).
  All CRUD via `supabase-js` under the `admin_all_*` RLS policies. Admin-only
  route guard (`beforeLoad`).
- **Entrance-exam**: application form → `submit-application`; tracker →
  `track-application`; exam discovery → `exam-discovery`; OTP access →
  `exam-access-request`/`-verify`; taking + grading → `exam-start`/`exam-submit`.
  **Exam answer secrecy preserved** — `correct_option` never reaches the client.
- `admission_settings` anon read fixed (grants migration `20260707000100`).

### Still legacy-only / stubbed

| Item | Note |
|------|------|
| Post-login `/admin` | Now a real SPA route (admin guard). |
| Bulk result emails (`sendBulkResultEmails`) | Stubbed with a clear error — add a `send-result-emails` Edge Function (reads attempts + Resend) to enable. |
| `/maintenance` | Not migrated — gated by `MAINTENANCE_MODE` server env; low priority. |
| `/entrance-exam/exam/$attemptId/result` full result page | The tracker shows pass/fail + score; the standalone per-attempt result page is not migrated. |
| Activity audit log | Legacy `logActivity` writes are omitted from client mutations (no audit trail from the SPA). |
| Legacy `server/actions/*`, `proxy.ts` middleware | Superseded by RLS + Edge Functions; remain in `legacy/next-app/`. |

## Server-only backend (RLS + Edge Functions)

The admin + entrance-exam server logic now has a concrete, written
implementation path — see **[RLS-EDGE-PLAN.md](RLS-EDGE-PLAN.md)**:

- `supabase/migrations/` — RLS + Storage policies (`is_admin()`, admin CRUD,
  public reads, exam tables kept service-role-only). Idempotent, additive.
- `supabase/functions/` — Edge Functions for the entrance-exam flow
  (`exam-access-request`/`-verify`, `exam-start`, `exam-submit`) and
  `submit-application`. Faithful ports; **service role** keeps exam answers +
  OTP + grading off the client.
- `src/lib/edge.ts` — SPA client (`supabase.functions.invoke`) for the above.

**Not yet deployed** — applying RLS to prod and deploying functions needs your
Supabase access token; see the plan's Runbook. Admin *UI pages* still consume
this layer as a follow-on (same page-migration pattern).

## Commands

```bash
pnpm install       # deps
pnpm dev           # dev server → http://localhost:3000
pnpm build         # tsc --noEmit && vite build
pnpm typecheck     # tsc --noEmit
pnpm preview       # preview production build
```

Legacy app: `cd legacy/next-app && pnpm install && pnpm dev`.

## Verification done

- `pnpm typecheck` clean; `pnpm build` succeeds (bundle warning is advisory).
- Browser-checked: `/`, `/about`, `/gallery` render faithfully (hero carousel,
  animations, cards, footer, theming).
- Anon RLS reads confirmed: `news_articles`, `gallery_items`, `announcements`,
  `application_periods`, `profiles` return 200 (DB currently has no published
  rows, so data sections render their empty states — same as legacy).

## Known risks / follow-ups

- Single JS bundle ~792 KB (three.js/tiptap/recharts pulled in). Code-split when
  admin/exam routes land; not optimized now to avoid redesign.
- Auth/admin/entrance-exam still to migrate — each needs an RLS/Edge-Function
  plan for its server-only writes, or keep them on the legacy app.
- `.env` holds the anon key (public by design). Never move the service-role key
  into this app.
