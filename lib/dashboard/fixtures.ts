/**
 * Dashboard fixtures. UI-only data until the database is in place.
 *
 * MIGRATION PLAN (when the DB lands):
 *   - Replace each `getX` function body with a Drizzle query.
 *   - The `Capsule`, `Wall`, `ActivityItem`, and `OverviewStats` types below
 *     are the contract — keep their shape stable so page components don't
 *     need to change.
 *   - `lib/dashboard/queries.ts` is the only import target for pages; do
 *     NOT import from this file directly outside the queries module.
 *
 * See PRD.md §2 for the underlying data model.
 */

export type CapsuleStatus = "scheduled" | "delivered" | "draft"
export type ContentType = "text" | "image" | "audio" | "video"

export interface Capsule {
  id: string
  title: string
  recipient: string
  /** ISO timestamp */
  deliveryDate: string
  status: CapsuleStatus
  contentType: ContentType
}

export interface Wall {
  id: string
  name: string
  slug: string
  /** ISO timestamp — when the wall unlocks for everyone */
  openDate: string
  contributions: number
  role: "organizer" | "contributor"
}

export interface ActivityItem {
  id: string
  kind: "capsule" | "wall"
  text: string
  /** ISO timestamp */
  at: string
}

export interface OverviewStats {
  scheduled: number
  delivered: number
  walls: number
  recent: ActivityItem[]
}

// ---- fixtures ---------------------------------------------------------------

const capsules: Capsule[] = [
  {
    id: "c_1",
    title: "For mum, on her 60th",
    recipient: "mum@seal.app",
    deliveryDate: "2026-11-12T09:00:00Z",
    status: "scheduled",
    contentType: "video",
  },
  {
    id: "c_2",
    title: "Year-end note to myself",
    recipient: "me@seal.app",
    deliveryDate: "2026-12-31T23:30:00Z",
    status: "scheduled",
    contentType: "text",
  },
  {
    id: "c_3",
    title: "Birthday voice note",
    recipient: "sam@seal.app",
    deliveryDate: "2026-08-04T08:00:00Z",
    status: "scheduled",
    contentType: "audio",
  },
  {
    id: "c_4",
    title: "Wedding morning — a photo",
    recipient: "alex@seal.app",
    deliveryDate: "2026-09-21T10:00:00Z",
    status: "draft",
    contentType: "image",
  },
  {
    id: "c_5",
    title: "Graduation video",
    recipient: "nora@seal.app",
    deliveryDate: "2026-06-15T14:00:00Z",
    status: "delivered",
    contentType: "video",
  },
  {
    id: "c_6",
    title: "Letter to my future self",
    recipient: "me@seal.app",
    deliveryDate: "2030-01-01T00:00:00Z",
    status: "scheduled",
    contentType: "text",
  },
]

const walls: Wall[] = [
  {
    id: "w_1",
    name: "Class of 2026",
    slug: "class-of-2026",
    openDate: "2027-06-15T17:00:00Z",
    contributions: 84,
    role: "organizer",
  },
  {
    id: "w_2",
    name: "Aria & Sam's wedding",
    slug: "aria-and-sam",
    openDate: "2026-09-21T16:00:00Z",
    contributions: 142,
    role: "contributor",
  },
  {
    id: "w_3",
    name: "Studio 12 — end of residency",
    slug: "studio-12",
    openDate: "2025-12-01T00:00:00Z",
    contributions: 23,
    role: "organizer",
  },
]

const recent: ActivityItem[] = [
  {
    id: "a_1",
    kind: "capsule",
    text: "Scheduled “For mum, on her 60th” for 12 Nov 2026",
    at: "2026-07-10T14:32:00Z",
  },
  {
    id: "a_2",
    kind: "wall",
    text: "Class of 2026 — 3 new contributions",
    at: "2026-07-09T09:11:00Z",
  },
  {
    id: "a_3",
    kind: "capsule",
    text: "Drafted “Wedding morning — a photo”",
    at: "2026-07-08T22:05:00Z",
  },
  {
    id: "a_4",
    kind: "wall",
    text: "Aria & Sam's wall unlocked for everyone",
    at: "2026-07-01T00:00:00Z",
  },
  {
    id: "a_5",
    kind: "capsule",
    text: "Delivered “Graduation video” to nora@seal.app",
    at: "2026-06-15T14:02:00Z",
  },
]

// ---- queries ----------------------------------------------------------------

// Tiny delay so call sites match a real async fetch/Drizzle call shape and
// pages render through React's `loading.tsx` boundaries when present.
const tick = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 0))

export async function getCapsules(): Promise<Capsule[]> {
  // TODO(db): replace with `db.select().from(capsules).where(eq(ownerId, session.user.id))`
  return tick(capsules)
}

export async function getWalls(): Promise<Wall[]> {
  // TODO(db): `db.select().from(walls).where(...)` filtered to walls the
  // current user organizes or has contributed to.
  return tick(walls)
}

export async function getOverview(): Promise<OverviewStats> {
  // TODO(db): aggregate counts via Drizzle.
  const scheduled = capsules.filter((c) => c.status === "scheduled").length
  const delivered = capsules.filter((c) => c.status === "delivered").length
  return tick({
    scheduled,
    delivered,
    walls: walls.length,
    recent: recent.slice(0, 5),
  })
}
