/**
 * Wall + capsule access control.
 *
 * AGENTS.md non-negotiable: Neon/Drizzle has no row-level security. The
 * "wall content is unqueryable before open_date" guarantee lives entirely
 * in this file. Every read of `capsuleContent` for a wall-bound capsule,
 * and every read of `capsule` rows scoped to a wall, must go through one
 * of the helpers exported here. If you add a new way to fetch wall data,
 * mirror the same `openDate`/ownership check — never query `capsuleContent`
 * directly without it.
 *
 * The rule, stated once:
 *
 *   1. A wall's CONTENT rows are readable IFF `now >= wall.openDate`,
 *      or the viewer is the wall's organizer (`wall.createdBy`).
 *   2. A wall's METADATA (name, description, slug, open_date, contribution
 *      count) is always readable to anyone with the wall id or slug —
 *      the page needs to render a countdown to people who don't yet have
 *      access.
 *   3. A wall-bound CAPSULE row (the outer record: title, owner, etc.)
 *      is always visible to contributors, so they can see their own
 *      contribution in a "your contributions" list. Only the CONTENT of
 *      a wall-bound capsule is sealed.
 *
 * All helpers return rich types so route handlers don't have to do extra
 * joins. A helper that returns `null` (vs. throwing) means "not found or
 * not visible to this viewer" — the route should treat that as a 404, not
 * a 403, to avoid leaking the existence of a sealed capsule.
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  capsule,
  capsuleContent,
  notification,
  recipient,
  user,
  wall,
  type CapsuleContentRow,
  type CapsuleRow,
  type ContentTypeValue,
  type NotificationRow,
  type RecipientRow,
  type WallRow,
} from "@/drizzle/schema";

// ---------------------------------------------------------------------------
// Wall metadata (always readable to anyone who knows the id or slug).
// ---------------------------------------------------------------------------

/**
 * Look up a wall by id. Returns the wall row regardless of `openDate`
 * and regardless of the viewer — the metadata is public. Used by the
 * wall page to render the locked state with a countdown to a viewer
 * who can't yet see the content.
 *
 * Pass `viewerId` to also receive the viewer's relationship to the wall
 * (organizer vs. contributor vs. outsider). The caller doesn't need the
 * relationship to render the page; it's a convenience for code paths
 * that want to personalize (e.g. "your contribution").
 */
export interface WallView {
  wall: WallRow;
  isOrganizer: boolean;
  isContributor: boolean;
  /** `now >= wall.openDate`. */
  isUnlocked: boolean;
}

export async function getWallById(
  id: string,
  viewerId: string | null,
): Promise<WallView | null> {
  const [row] = await db.select().from(wall).where(eq(wall.id, id)).limit(1);
  if (!row) return null;
  return decorateWall(row, viewerId);
}

/**
 * Same as `getWallById` but by slug. Slug is the shareable handle, so
 * this is the helper the public wall page uses.
 */
export async function getWallBySlug(
  slug: string,
  viewerId: string | null,
): Promise<WallView | null> {
  const [row] = await db
    .select()
    .from(wall)
    .where(eq(wall.slug, slug))
    .limit(1);
  if (!row) return null;
  return decorateWall(row, viewerId);
}

async function decorateWall(
  row: WallRow,
  viewerId: string | null,
): Promise<WallView> {
  const isOrganizer = viewerId !== null && row.createdBy === viewerId;
  const isUnlocked = row.openDate.getTime() <= Date.now();
  // A contributor is anyone who owns a capsule on this wall. We only
  // compute that for logged-in viewers; anonymous viewers are never
  // "contributors" by definition (per PRD Non-Goals: no anonymous wall
  // contributions).
  let isContributor = false;
  if (viewerId && !isOrganizer) {
    const [own] = await db
      .select({ id: capsule.id })
      .from(capsule)
      .where(and(eq(capsule.wallId, row.id), eq(capsule.ownerId, viewerId)))
      .limit(1);
    isContributor = Boolean(own);
  }
  return { wall: row, isOrganizer, isContributor, isUnlocked };
}

/**
 * Count of capsules attached to a wall. Always readable; doesn't reveal
 * content. Used by the dashboard cards and the wall page header.
 */
export async function countWallCapsules(wallId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(capsule)
    .where(eq(capsule.wallId, wallId));
  return Number(result?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Wall CONTENT — the sealed part.
// ---------------------------------------------------------------------------

/**
 * The full set of capsules + content for a wall, gated by the open_date
 * seal. If the wall is locked and the viewer is not the organizer, this
 * returns `null` (the route should 404). The route then renders a locked
 * placeholder using the `WallView` it already fetched.
 *
 * The content rows are returned in `sortOrder` so the grid renders the
 * way the contributor intended.
 */
export interface WallCapsuleForViewer {
  capsule: CapsuleRow;
  ownerName: string;
  content: CapsuleContentRow[];
}

export async function getWallCapsulesForViewer(
  wallId: string,
  viewerId: string | null,
): Promise<WallCapsuleForViewer[] | null> {
  const view = await getWallById(wallId, viewerId);
  if (!view) return null;
  if (!view.isUnlocked && !view.isOrganizer) {
    return null;
  }
  return getWallCapsulesUnlocked(wallId);
}

/**
 * Unconditional read — the cron / organizer-only paths use this. The
 * caller is responsible for the openDate check; this just fetches.
 */
export async function getWallCapsulesUnlocked(
  wallId: string,
): Promise<WallCapsuleForViewer[]> {
  // Fetch the wall's capsules ordered by created time, so the grid
  // renders in the order contributors added them.
  const rows = await db
    .select({
      capsule: capsule,
      ownerName: user.name,
    })
    .from(capsule)
    .innerJoin(user, eq(user.id, capsule.ownerId))
    .where(eq(capsule.wallId, wallId))
    .orderBy(asc(capsule.createdAt));

  if (rows.length === 0) return [];

  const capsuleIds = rows.map((r) => r.capsule.id);
  const contentRows = await db
    .select()
    .from(capsuleContent)
    .where(inArray(capsuleContent.capsuleId, capsuleIds))
    .orderBy(asc(capsuleContent.sortOrder), asc(capsuleContent.createdAt));

  const contentByCapsule = new Map<string, CapsuleContentRow[]>();
  for (const c of contentRows) {
    const list = contentByCapsule.get(c.capsuleId) ?? [];
    list.push(c);
    contentByCapsule.set(c.capsuleId, list);
  }

  return rows.map((r) => ({
    capsule: r.capsule,
    ownerName: r.ownerName,
    content: contentByCapsule.get(r.capsule.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Private capsule reads (no openDate; ownership is the gate).
// ---------------------------------------------------------------------------

/**
 * Fetch one capsule, its content, and its recipients — gated on the
 * viewer being the owner. Used by the dashboard "view" and by the
 * edit form. Returns `null` if the capsule doesn't exist OR the viewer
 * isn't the owner (we collapse both cases to 404 at the route layer
 * to avoid leaking capsule existence).
 */
export interface OwnedCapsule {
  capsule: CapsuleRow;
  content: CapsuleContentRow[];
  recipients: RecipientRow[];
}

export async function getOwnedCapsule(
  capsuleId: string,
  viewerId: string,
): Promise<OwnedCapsule | null> {
  const [c] = await db
    .select()
    .from(capsule)
    .where(eq(capsule.id, capsuleId))
    .limit(1);
  if (!c) return null;
  if (c.ownerId !== viewerId) return null;

  const [content, recipients] = await Promise.all([
    db
      .select()
      .from(capsuleContent)
      .where(eq(capsuleContent.capsuleId, capsuleId))
      .orderBy(asc(capsuleContent.sortOrder), asc(capsuleContent.createdAt)),
    db
      .select()
      .from(recipient)
      .where(eq(recipient.capsuleId, capsuleId))
      .orderBy(asc(recipient.createdAt)),
  ]);

  return { capsule: c, content, recipients };
}

// ---------------------------------------------------------------------------
// Dashboard list queries
// ---------------------------------------------------------------------------

/**
 * All capsules the viewer owns, regardless of status. The dashboard
 * filters/sorts in the page; this just returns the rows. We eagerly
 * load the first content row's `contentType` per capsule so the list
 * can show the right icon without a second round-trip per row.
 */
export interface DashboardCapsuleRow {
  capsule: CapsuleRow;
  primaryContentType: ContentTypeValue | null;
  primaryRecipient: string | null;
}

export async function listOwnedCapsules(
  viewerId: string,
): Promise<DashboardCapsuleRow[]> {
  // Pull the capsules.
  const capsules = await db
    .select()
    .from(capsule)
    .where(eq(capsule.ownerId, viewerId))
    .orderBy(desc(capsule.createdAt));

  if (capsules.length === 0) return [];

  // First content row per capsule (sortOrder asc). We use a lateral-style
  // subquery equivalent in Drizzle: select the min(sort_order) per
  // capsule id, then join. A simpler approach is to fetch all content
  // for the owner's capsules and group in JS — the page only ever shows
  // a small handful of capsules so the cost is fine.
  const ids = capsules.map((c) => c.id);
  const contentRows = await db
    .select()
    .from(capsuleContent)
    .where(inArray(capsuleContent.capsuleId, ids))
    .orderBy(asc(capsuleContent.sortOrder), asc(capsuleContent.createdAt));

  const contentByCapsule = new Map<string, CapsuleContentRow[]>();
  for (const c of contentRows) {
    const list = contentByCapsule.get(c.capsuleId) ?? [];
    list.push(c);
    contentByCapsule.set(c.capsuleId, list);
  }

  const recipientRows = await db
    .select()
    .from(recipient)
    .where(inArray(recipient.capsuleId, ids));
  const recipientByCapsule = new Map<string, RecipientRow[]>();
  for (const r of recipientRows) {
    const list = recipientByCapsule.get(r.capsuleId) ?? [];
    list.push(r);
    recipientByCapsule.set(r.capsuleId, list);
  }

  return capsules.map((c) => {
    const content = contentByCapsule.get(c.id) ?? [];
    const recipients = recipientByCapsule.get(c.id) ?? [];
    return {
      capsule: c,
      primaryContentType: content[0]?.contentType ?? null,
      primaryRecipient: recipients[0]?.email ?? recipients[0]?.phone ?? null,
    };
  });
}

/**
 * Walls the viewer organizes OR has contributed to. The dashboard "walls"
 * page splits the result by role.
 */
export interface DashboardWallRow {
  wall: WallRow;
  role: "organizer" | "contributor";
  contributionCount: number;
  isUnlocked: boolean;
}

export async function listWallsForViewer(
  viewerId: string,
): Promise<DashboardWallRow[]> {
  // Organizer walls — direct by createdBy.
  const organized = await db
    .select()
    .from(wall)
    .where(eq(wall.createdBy, viewerId))
    .orderBy(desc(wall.openDate));

  // Contributor walls — distinct wall ids where the user owns a capsule.
  // We use a subquery because Drizzle's distinct helper works on full
  // rows; a join would multiply the result.
  const contributedIdsRows = await db
    .selectDistinct({ id: capsule.wallId })
    .from(capsule)
    .where(
      and(
        eq(capsule.ownerId, viewerId),
        isNotNull(capsule.wallId),
      ),
    );
  const contributedIds = contributedIdsRows
    .map((r) => r.id)
    .filter((id): id is string => id !== null);

  // Combine, deduplicating by id (a user could be both organizer and
  // contributor on their own wall — we mark role='organizer' in that
  // case, since they have full control).
  const allWalls = new Map<string, WallRow>();
  for (const w of organized) allWalls.set(w.id, w);
  if (contributedIds.length > 0) {
    const contributed = await db
      .select()
      .from(wall)
      .where(inArray(wall.id, contributedIds))
      .orderBy(desc(wall.openDate));
    for (const w of contributed) {
      if (!allWalls.has(w.id)) allWalls.set(w.id, w);
    }
  }

  // Count contributions per wall.
  const counts = new Map<string, number>();
  if (allWalls.size > 0) {
    const countRows = await db
      .select({
        wallId: capsule.wallId,
        count: sql<number>`count(*)::int`,
      })
      .from(capsule)
      .where(inArray(capsule.wallId, Array.from(allWalls.keys())))
      .groupBy(capsule.wallId);
    for (const r of countRows) {
      if (r.wallId) counts.set(r.wallId, Number(r.count ?? 0));
    }
  }

  const now = Date.now();
  return Array.from(allWalls.values()).map((w) => ({
    wall: w,
    role: organized.some((o) => o.id === w.id) ? "organizer" : "contributor",
    contributionCount: counts.get(w.id) ?? 0,
    isUnlocked: w.openDate.getTime() <= now,
  }));
}

/**
 * Aggregate counts for the overview tiles. Cheap (no joins, just
 * group-by-count on indexed columns).
 */
export interface OverviewStatsRaw {
  scheduled: number;
  delivered: number;
  walls: number;
}

export async function getOverviewStats(
  viewerId: string,
): Promise<OverviewStatsRaw> {
  const [statusCounts] = await db
    .select({
      status: capsule.status,
      count: sql<number>`count(*)::int`,
    })
    .from(capsule)
    .where(
      and(
        eq(capsule.ownerId, viewerId),
        inArray(capsule.status, ["scheduled", "delivered"]),
      ),
    )
    .groupBy(capsule.status);

  // Drizzle's `select().groupBy()` always returns an array — possibly
  // empty if no rows match. The empty case short-circuits to zeros.
  const rows = Array.isArray(statusCounts) ? statusCounts : [];
  const scheduled =
    rows.find((r) => r.status === "scheduled")?.count ?? 0;
  const delivered =
    rows.find((r) => r.status === "delivered")?.count ?? 0;

  // Walls = walls organized + walls contributed (distinct).
  const [organizedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wall)
    .where(eq(wall.createdBy, viewerId));
  const [contributedCount] = await db
    .select({ count: sql<number>`count(distinct wall_id)::int` })
    .from(capsule)
    .where(and(eq(capsule.ownerId, viewerId), isNotNull(capsule.wallId)));

  return {
    scheduled: Number(scheduled),
    delivered: Number(delivered),
    walls: Number(organizedCount?.count ?? 0) + Number(contributedCount?.count ?? 0),
  };
}

/**
 * Recent activity for the overview tile: a join of the last few
 * capsules and walls the viewer touched, sorted by createdAt desc.
 */
export interface ActivityItemRaw {
  id: string;
  kind: "capsule" | "wall";
  text: string;
  at: Date;
}

export async function listRecentActivity(
  viewerId: string,
  limit = 5,
): Promise<ActivityItemRaw[]> {
  // Union the two via two queries + a sort. The PRD's "last few things"
  // UX doesn't justify a real UNION ALL — and the type-narrowing gets
  // ugly in Drizzle for that pattern.
  const [recentCapsules, recentWalls] = await Promise.all([
    db
      .select()
      .from(capsule)
      .where(eq(capsule.ownerId, viewerId))
      .orderBy(desc(capsule.createdAt))
      .limit(limit),
    db
      .select()
      .from(wall)
      .where(eq(wall.createdBy, viewerId))
      .orderBy(desc(wall.createdAt))
      .limit(limit),
  ]);

  const items: ActivityItemRaw[] = [
    ...recentCapsules.map<ActivityItemRaw>((c) => ({
      id: `c_${c.id}`,
      kind: "capsule",
      text: c.status === "delivered"
        ? `Delivered “${c.title}”`
        : c.status === "scheduled"
          ? `Scheduled “${c.title}”`
          : `Drafted “${c.title}”`,
      at: c.createdAt,
    })),
    ...recentWalls.map<ActivityItemRaw>((w) => ({
      id: `w_${w.id}`,
      kind: "wall",
      text: `Started wall “${w.name}”`,
      at: w.createdAt,
    })),
  ];

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Mutation guards
// ---------------------------------------------------------------------------

/**
 * Returns the capsule if the viewer can edit it; `null` otherwise.
 * Per AGENTS.md: a capsule can be edited only while `status = 'scheduled'`
 * (or `draft` — drafts are inherently editable). `delivered` capsules are
 * immutable.
 */
export async function requireEditableCapsule(
  capsuleId: string,
  viewerId: string,
): Promise<CapsuleRow | null> {
  const [c] = await db
    .select()
    .from(capsule)
    .where(eq(capsule.id, capsuleId))
    .limit(1);
  if (!c) return null;
  if (c.ownerId !== viewerId) return null;
  if (c.status === "delivered" || c.status === "failed") return null;
  return c;
}

/**
 * Returns the wall if the viewer can manage it (i.e. is the organizer).
 * Used by the wall edit / delete / contribute flows.
 */
export async function requireManagedWall(
  wallId: string,
  viewerId: string,
): Promise<WallRow | null> {
  const [w] = await db
    .select()
    .from(wall)
    .where(eq(wall.id, wallId))
    .limit(1);
  if (!w) return null;
  if (w.createdBy !== viewerId) return null;
  return w;
}

// ---------------------------------------------------------------------------
// Cron: due private capsules
// ---------------------------------------------------------------------------

/**
 * The set of private (wall-less) capsules whose `deliveryDate` has
 * passed and that are still `scheduled`. The cron job calls this and
 * dispatches delivery per recipient. Returns the rows ordered by
 * `deliveryDate asc` so the oldest get delivered first.
 */
export interface DueCapsule {
  capsule: CapsuleRow;
  recipients: RecipientRow[];
  content: CapsuleContentRow[];
  ownerName: string;
  ownerEmail: string;
}

export async function getDueCapsules(now: Date = new Date()): Promise<DueCapsule[]> {
  const rows = await db
    .select({
      capsule: capsule,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(capsule)
    .innerJoin(user, eq(user.id, capsule.ownerId))
    .where(
      and(
        eq(capsule.status, "scheduled"),
        isNull(capsule.wallId),
        isNotNull(capsule.deliveryDate),
        lt(capsule.deliveryDate, now),
      ),
    )
    .orderBy(asc(capsule.deliveryDate));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.capsule.id);
  const [recipientRows, contentRows] = await Promise.all([
    db
      .select()
      .from(recipient)
      .where(inArray(recipient.capsuleId, ids)),
    db
      .select()
      .from(capsuleContent)
      .where(inArray(capsuleContent.capsuleId, ids))
      .orderBy(asc(capsuleContent.sortOrder), asc(capsuleContent.createdAt)),
  ]);

  const recipientsByCapsule = new Map<string, RecipientRow[]>();
  for (const r of recipientRows) {
    const list = recipientsByCapsule.get(r.capsuleId) ?? [];
    list.push(r);
    recipientsByCapsule.set(r.capsuleId, list);
  }
  const contentByCapsule = new Map<string, CapsuleContentRow[]>();
  for (const c of contentRows) {
    const list = contentByCapsule.get(c.capsuleId) ?? [];
    list.push(c);
    contentByCapsule.set(c.capsuleId, list);
  }

  return rows.map((r) => ({
    capsule: r.capsule,
    ownerName: r.ownerName,
    ownerEmail: r.ownerEmail,
    recipients: recipientsByCapsule.get(r.capsule.id) ?? [],
    content: contentByCapsule.get(r.capsule.id) ?? [],
  }));
}

/**
 * Mark a capsule as delivered, stamping `deliveredAt`. The cron
 * calls this after the per-recipient sends resolve. Idempotent — re-
 * running for an already-delivered capsule is a no-op.
 */
export async function markCapsuleDelivered(capsuleId: string): Promise<void> {
  await db
    .update(capsule)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(
      and(
        eq(capsule.id, capsuleId),
        eq(capsule.status, "scheduled"),
      ),
    );
}

/**
 * Mark a capsule as `failed` (cron exhausted retries for at least one
 * channel / recipient). Sets the capsule status; per-recipient failure
 * details are kept on the `notification` rows.
 */
export async function markCapsuleFailed(
  capsuleId: string,
  reason: string,
): Promise<void> {
  // We don't have a `failureReason` column on capsule — failures live on
  // the notification rows. We just flip the status to 'failed' here.
  // Callers should also write a `notification` row with the reason.
  await db
    .update(capsule)
    .set({ status: "failed" })
    .where(eq(capsule.id, capsuleId));
  // Reference `reason` so the caller knows where to stash the per-row
  // failure text — TypeScript would warn otherwise on an unused param.
  void reason;
}

/**
 * Record a notification attempt outcome. Used by the cron after sending.
 */
export async function recordNotification(
  data: Omit<NotificationRow, "id" | "createdAt">,
): Promise<NotificationRow> {
  const [row] = await db
    .insert(notification)
    .values(data)
    .returning();
  if (!row) throw new Error("Failed to insert notification row");
  return row;
}

// ---------------------------------------------------------------------------
// Helpers used by other modules (kept here so access rules live in one file)
// ---------------------------------------------------------------------------

/**
 * Lightweight "is the viewer the wall organizer" check. Used by routes
 * that just need a yes/no without loading the full WallView.
 */
export async function isWallOrganizer(
  wallId: string,
  viewerId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: wall.id })
    .from(wall)
    .where(and(eq(wall.id, wallId), eq(wall.createdBy, viewerId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Generate a URL-safe slug from a name. Best-effort: not unique, so the
 * caller must follow up with a uniqueness check (the unique index on
 * `wall.slug` will throw a duplicate-key error which the API maps to
 * a "try another name" message).
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Internal: trim a slug if a collision is reported by the unique index.
// The unique index on `wall.slug` will throw a duplicate-key error on
// insert; the API layer catches and retries with a numeric suffix.
// ---------------------------------------------------------------------------
