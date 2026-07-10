# AGENTS.md — Capsule

Instructions for any AI coding agent (Claude Code, Cursor, etc.) working in this repo.
Read this before making changes. See `PRD.md` for full product requirements and
`supabase/schema.sql` for the data model.

## Project summary
Capsule lets users schedule a message (text/audio/video/image) for future delivery —
either privately to one recipient, or as a contribution to a public "wall" that unlocks
for everyone at a shared `open_date`. Full requirements: `PRD.md`.

## Stack (do not substitute without asking)
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Neon (serverless Postgres) accessed exclusively through **Drizzle ORM** — no raw SQL,
  no other ORM
- **Better Auth** for authentication/sessions (backed by the `users` table in
  `drizzle/schema.ts`)
- **UploadThing** for all image/audio/video capsule uploads — not Supabase Storage, not S3
- Resend (email), Twilio (SMS), `web-push` (push notifications)
- Vercel Cron for scheduled delivery, Vercel for hosting
- Icons: `lucide-react` only — don't add a second icon library

## Design system (Betha Groups official brand — follow it, don't reinvent)
Source: Betha Groups official brand identity guide. This **supersedes** the earlier dark
indigo/cyan draft — if you see `#000000` backgrounds, `Poppins`/`Oswald`, or the wider
secondary palette anywhere in the code, they're stale and should be updated to match this.

- **Theme**: light. Background `#FFFFFF` (primary background across all applications).
- **Primary**: `#3513A5` — the brand purple, used for recognition (logo, primary accents,
  links, active states).
- **Button/text**: `#000000` — buttons and strong-contrast text sit on black
  (e.g. a primary CTA is a solid black pill with white text — see the "Learn More"
  reference in the brand guide), body text is also black on white.
- **Font**: `Atkinson Hyperlegible` only — Bold for headings, Medium/Regular for body and
  UI text. No second typeface; don't introduce one.
- All colors must be defined as CSS variables in `app/globals.css` and referenced via
  `var(--color-*)` — never hardcode hex values in components.
- **Logo mark**: the Betha Groups seal (stylized person/tree icon) can be used standalone,
  in `#3513A5`, wherever a compact brand mark is needed (favicon, loading state, etc.).
- Follow the interaction-state checklist for every new component: default, hover, focus,
  disabled, loading, error, empty (see `components/CapsuleForm.tsx` for the reference
  pattern — every field has a visible label, inline error, and the submit button has a
  loading state).

## Build order — follow this sequence, don't jump ahead
1. Auth + private text/image capsule + email delivery (core loop — get this fully working
   before touching anything else)
2. Public walls: creation, contribution, unlock-on-`open_date` logic
3. Audio/video upload to Supabase Storage
4. SMS (Twilio) + push (`web-push`) channels
5. Drag-and-drop scheduler UI polish + PWA manifest/service worker

Do not start step N+1 until step N is demoable end-to-end. If you're asked to add a
feature from a later step while an earlier step is incomplete, flag this rather than
silently reordering.

## Non-negotiables
- **There is no RLS in this stack** — Neon/Drizzle enforces nothing automatically. The
  "wall content is unqueryable before `open_date`" guarantee lives entirely in
  `lib/wall-access.ts`. **Every** read of `capsuleContent` or wall-scoped `capsules` rows
  must go through those helpers (or exactly mirror their logic) — never query
  `capsuleContent` directly from a new route without checking `open_date`/ownership first.
- A wall's capsule content must be **unqueryable**, not just unrendered, before its
  `open_date`. If you touch `lib/wall-access.ts` or add a new way to fetch wall data,
  re-verify by querying as a non-owner both before and after `open_date`.
- Capsules can only be edited/deleted while `status = 'scheduled'`. Once `status =
  'delivered'`, treat rows as immutable.
- Delivery is cron-driven (`/api/cron/deliver`, every 10 min per `vercel.json`) — don't
  add synchronous "send now" logic to the capsule creation route; creation only schedules.
- UploadThing endpoints (`app/api/uploadthing/core.ts`) must check for a valid Better Auth
  session in `.middleware()` before issuing an upload URL — never allow unauthenticated
  uploads.
- Never commit real API keys or the Neon connection string. `.env.local` is gitignored;
  use `.env.example` for documented placeholders.

## File map
- `app/page.tsx` — landing page
- `app/capsules/new/page.tsx` + `components/CapsuleForm.tsx` — capsule creation flow
  (media fields upload via UploadThing's `UploadButton`, see `lib/uploadthing.ts`)
- `app/walls/[id]/page.tsx` + `components/WallGrid.tsx` — public wall view
- `app/api/capsules/route.ts` — capsule creation endpoint
- `app/api/cron/deliver/route.ts` — scheduled delivery job, reads due capsules via
  `lib/wall-access.ts#getDueCapsules`
- `app/api/uploadthing/core.ts` + `route.ts` — UploadThing file router (image/audio/video
  endpoints), gated by a Better Auth session check
- `drizzle/schema.ts` — source of truth for the data model; run `drizzle-kit generate` +
  `drizzle-kit migrate` after any change here
- `drizzle.config.ts` — points Drizzle Kit at `DATABASE_URL` (Neon)
- `lib/db.ts` — Neon + Drizzle client
- `lib/wall-access.ts` — **the access-control layer**; read this before touching any
  wall/capsule query
- `lib/auth.ts` (to add) — Better Auth config/instance
- `lib/uploadthing.ts` (to add) — typed `UploadButton`/`UploadDropzone` helpers generated
  from `OurFileRouter`

## When implementing a stubbed TODO
The stubbed routes (`app/api/capsules/route.ts`, `app/api/cron/deliver/route.ts`) have
numbered comments describing the exact steps. Implement them in order, and don't remove a
step without replacing it — each one maps to a PRD acceptance criterion.

## Testing expectations
- Before marking a feature done, manually verify the specific acceptance criterion in
  `PRD.md` §2, not just "it renders."
- For the wall unlock feature specifically: test as an authenticated non-owner, both
  before and after `open_date`, and confirm content is genuinely inaccessible (network
  tab / direct query), not just visually hidden.

## What NOT to do
- Don't add a state management library (Redux, Zustand, etc.) — `useState`/`useEffect` is
  sufficient at this scope.
- Don't add a second CSS approach (styled-components, CSS modules) alongside Tailwind.
- Don't invent new brand colors or fonts outside the design tokens in `globals.css`.
- Don't build v2/v3 features (comments, reactions, templates, analytics — see PRD Non-Goals
  and Roadmap) unless explicitly asked.
