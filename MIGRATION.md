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
| 404 / errors | `app/not-found.tsx`, `app/error.tsx`, `gallery/error.tsx` | router not-found / error components |

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

## Legacy-only / deferred (NOT migrated — need a server)

These remain fully functional in `legacy/next-app/` and were **not** faked with
static data. Reproducing them in the SPA needs the "Next as API backend"
strategy (rejected) or new RLS/Edge Functions.

| Feature | Why it can't move to the browser |
|---------|----------------------------------|
| `admission_settings` read | Table RLS denies anon `SELECT` (Postgres 42501). CTA open/closed still works via `application_periods`; footer/contact fall back to `siteConfig`. |
| Entrance-exam application (`/entrance-exam`, `/entrance-exam/exam*`) | `createPublicApplication`, file uploads, payment, `startPublicExamAttempt`, `getVerifiedPublicExamAccess` — server actions + **exam answer secrecy** (must not ship question bank/answers to the client). |
| Auth pages (`/login`, `/register`, `/forgot-password`) | Sign-in itself works via `supabase.auth`, but the surrounding server actions (`auth.actions`) and middleware role-gating are server-side. Not yet ported. |
| Account (`/verify-email`, `/reset-password`) | Supabase auth callbacks + server actions. |
| Admin panel (`/admin/**`) | Service-role writes (Drizzle + `supabase/admin`), audit logs, CMS/exam/user/payment management, XLSX, email. |
| Gallery admin inline-delete | Service-role `deleteGalleryItems`/`deleteAllGalleryItems`. Public gallery is read-only; management belongs in the admin panel. |
| `/maintenance` | Gated by `MAINTENANCE_MODE` server env + middleware. |
| Email (nodemailer/resend), middleware (`proxy.ts`), all `server/actions/*` | Server runtime only. |

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
