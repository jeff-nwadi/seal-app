/**
 * Dashboard page contracts.
 *
 * These types describe the shape of the data the dashboard pages
 * render. The shape is owned by the pages, NOT by the DB schema —
 * `lib/dashboard/queries.ts` translates from the DB row format into
 * these shapes. That way the pages can render fixture data (or a
 * different backend) without changing.
 *
 * Why a separate file: the old `lib/dashboard/queries.ts` re-exported
 * types from `fixtures.ts`. Now that the DB is the source of truth,
 * the types live in `contracts.ts` (no fixture dependency) and the
 * queries module owns the DB→contract translation.
 */

export type CapsuleStatus = "scheduled" | "delivered" | "draft";
export type ContentType = "text" | "image" | "audio" | "video";

export interface Capsule {
  id: string;
  title: string;
  recipient: string;
  /** ISO timestamp */
  deliveryDate: string;
  status: CapsuleStatus;
  contentType: ContentType;
}

export interface Wall {
  id: string;
  name: string;
  slug: string;
  /** ISO timestamp — when the wall unlocks for everyone */
  openDate: string;
  contributions: number;
  role: "organizer" | "contributor";
}

export interface ActivityItem {
  id: string;
  kind: "capsule" | "wall";
  text: string;
  /** ISO timestamp */
  at: string;
}

export interface OverviewStats {
  scheduled: number;
  delivered: number;
  walls: number;
  recent: ActivityItem[];
}
