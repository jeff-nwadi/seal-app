# PRD: Capsule — Scheduled Message Time Capsule

**Status:** Draft v1
**Owner:** TBD (assignee)
**Last updated:** 2026-07-09

---

## 1. Executive Summary

**Problem Statement**
People want to send a message — to themselves or someone else — that arrives at a
specific future moment, not now. Existing tools (email drafts, calendar reminders) don't
support rich media, don't support group/public participation, and don't guarantee the
content stays sealed until the right time.

**Proposed Solution**
A web app where users create "capsules" (text, photo, voice, or video messages) tied to a
future delivery date. Capsules are either private (delivered to one recipient) or attached
to a public "wall" (a shared capsule multiple people contribute to, which unlocks for
everyone at once — e.g. a graduating class or a wedding).

**Success Criteria**
- All 5 required features (scheduler, multi-format capsules, public walls, multi-channel
  delivery, installable PWA) are implemented and demoable end-to-end.
- 100% of capsules scheduled for delivery are sent within 10 minutes of their
  `delivery_date` (bounded by the cron interval in `vercel.json`).
- 0% of wall contributions are visible before `open_date` (enforced by DB-level RLS, not
  just UI hiding).
- Lighthouse PWA installability score = 100 (manifest + service worker present and valid).
- TBD: adoption targets (e.g. number of capsules created, walls started) — not set because
  this is a task submission, not a live product with existing traffic.

---

## 2. User Experience & Functionality

**Brand & Visual Identity**
Follows the official Betha Groups brand identity guide (light theme, not the earlier dark
draft — this supersedes it):
- **Primary**: `#3513A5` (used for brand recognition — logo, primary UI accents)
- **Background (neutral)**: `#FFFFFF` — primary background across all applications
- **Button/text**: `#000000` — used for buttons, text, and strong contrast (e.g. the
  "Learn More" button is solid black with white text)
- **Typography**: `Atkinson Hyperlegible` — the single approved typeface across all brand
  design (Bold / Medium / Regular weights cover headings through body text; no secondary
  typeface specified for product UI)
- **Logo/mark**: the Betha Groups "seal" (a stylized person/tree icon) can be used
  standalone as an icon-only mark, in the primary purple `#3513A5`
Full token list lives in `AGENTS.md` and `app/globals.css`.

**User Personas**
- **Individual sender** — wants to write a message to their future self or someone else
  (e.g. a birthday message to a long-distance family member).
- **Organizer** — a teacher, event planner, or couple who starts a public wall for a group.
- **Contributor** — a member of that group (student, guest) who adds a capsule to the wall
  but doesn't manage it.

**User Stories**
1. As an individual, I want to write/record a message and pick a future delivery date, so
   that it reaches me or a loved one at the right moment.
2. As a user, I want to attach text, audio, video, or images to a capsule, so that I can
   express things the way I want.
3. As an organizer, I want to create a public capsule wall others can contribute to, so
   that a group can build a shared time capsule.
4. As a contributor, I want to see when a wall unlocks, so that I don't miss the reveal.
5. As a user, I want to choose how I'm notified (email/SMS/push), so that I actually see
   the message when it arrives.
6. As a user, I want to install the app to my phone like a native app (PWA), so that it
   feels persistent.
7. As a user, I want to edit or cancel a scheduled capsule before it's delivered, so that I
   can fix mistakes.

**Acceptance Criteria**
- Story 1: Delivery date must be a future date (client- and server-validated); capsule is
  rejected with an inline error if the date is in the past or missing.
- Story 2: Content type selector supports exactly 4 types (text, audio, video, image); at
  least one piece of content is required before submission.
- Story 3: Wall creation requires a name and an `open_date`; wall gets a unique shareable
  slug.
- Story 4: Wall page shows a locked state (blurred cards + countdown) before `open_date`
  and an unlocked grid after, with no client-side way to view content early (enforced via
  RLS policy in `supabase/schema.sql`).
- Story 5: At least one delivery channel must be selected; unselected channels are not
  contacted.
- Story 6: `manifest.json` + service worker pass Lighthouse's installability check.
- Story 7: A capsule can be edited or deleted only while `status = 'scheduled'`; once
  `status = 'delivered'`, it's immutable.

**Non-Goals** (explicitly out of scope for this build)
- Payments / monetization
- Multi-language / i18n support
- Collaborative editing of a single private capsule (v2 idea)
- Comments or reactions on unlocked wall capsules (v2 idea)
- Native iOS/Android apps (PWA only)
- Anonymous (unauthenticated) contributions to public walls

---

## 3. AI System Requirements

Not applicable — this product does not include an AI/LLM-powered feature. (If a future
version adds e.g. AI-assisted message prompts or a "what to write" helper, this section
should be revisited.)

---

## 4. Technical Specifications

**Architecture Overview**
```
Next.js Frontend (React/TS) ⇄ Next.js API Routes ⇄ Neon (Postgres, via Drizzle ORM)
                                      │
                    ┌─────────────────┼─────────────────┐
               Better Auth      UploadThing          Resend / Twilio / Web Push
               (sessions)       (image/audio/video)  (email / SMS / push)
                                      ▲
                                Vercel Cron
                          (polls due capsules every 10 min,
                           triggers /api/cron/deliver)
```

**Data Model** (full detail in `drizzle/schema.ts`)
- `users` — id, name, email, phone, createdAt (Better Auth manages sessions/accounts
  against this table)
- `walls` — id, name, description, slug, openDate, createdBy, visibility
- `capsules` — id, ownerId, wallId (nullable), deliveryDate, status
- `capsuleContent` — id, capsuleId, contentType, contentText, contentUrl,
  uploadthingKey, sortOrder
- `recipients` — id, capsuleId, email/phone, deliveryChannel
- `notifications` — id, recipientId, channel, status, scheduledFor

**Integration Points**
- **Auth**: Better Auth (email/password sessions), backed by the `users` table in the
  same Neon database
- **DB**: Neon Postgres, accessed exclusively through Drizzle ORM (`lib/db.ts`) — no raw
  SQL from route handlers
- **File storage**: UploadThing for all audio/video/image capsule content; the resulting
  URL + file key are stored in `capsuleContent.contentUrl` / `uploadthingKey`
- **Email**: Resend API
- **SMS**: Twilio API
- **Push**: Web Push protocol via the `web-push` npm package + a service worker
- **Scheduler**: Vercel Cron hitting `/api/cron/deliver` every 10 minutes

**Security & Privacy**
- Neon/Drizzle has **no row-level security** — unlike the original Supabase design, the
  "wall content is unqueryable before `open_date`" guarantee must be enforced in
  application code (`lib/wall-access.ts`), not the database. This is a deliberate,
  higher-risk tradeoff versus the original plan and needs explicit test coverage (query as
  a non-owner, before and after `open_date`).
- UploadThing uploads must run through an authenticated middleware check (Better Auth
  session) before issuing an upload URL — an unauthenticated request must not be able to
  upload capsule media.
- Recipient contact info (email/phone) is only readable by the capsule's owner — enforced
  in the API route, same as before.
- No third-party analytics or ad trackers.
- TBD: data retention policy for delivered capsules' media on UploadThing.

---

## 5. Risks & Roadmap

**Phased Rollout**
- **MVP (Phase 1)**: Auth, private text/image capsules, email delivery, basic wall
  creation/contribution/unlock. This is the full required feature set at "works" quality.
- **v1.1**: Audio/video upload, SMS + push channels, drag-and-drop scheduler UI, PWA
  manifest/service worker polish.
- **v2 (future, not built now)**: Collaborative private capsules, reactions/comments on
  unlocked walls, organizer analytics (who opened, who's pending), wall templates.

**Technical Risks**
- **Cron granularity**: 10-minute polling means delivery isn't instant; acceptable for this
  use case (nobody needs millisecond precision on a message scheduled months out), but
  should be stated explicitly so it isn't mistaken for a bug.
- **Third-party dependency limits**: Resend/Twilio free tiers have send caps — fine for a
  demo, would need paid tiers for real usage.
- **Media storage cost/size**: video uploads are the most likely feature to run over time
  budget; sequenced last in the build plan so a partial cut doesn't block the demo.
- **App-layer access control correctness**: since Neon/Drizzle has no RLS, the "sealed
  until open_date" guarantee lives entirely in `lib/wall-access.ts`. This is a bigger risk
  than the original Supabase RLS design — a single route that queries `capsuleContent`
  directly (bypassing the helper) would silently break the seal. Needs a manual test
  (query as a non-owner before and after `open_date`) before calling this feature done,
  and ideally a code-review rule that all wall/capsule content reads go through the helper.

---

## Open Questions / TBD
- Data retention period for delivered media
- Whether public walls need moderation (a way to remove an inappropriate contribution)
- Adoption/usage targets, if this becomes more than a one-time submission
