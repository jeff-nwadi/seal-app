/**
 * DELETE /api/walls/[id]
 *
 * Hard-deletes a wall owned by the current user. The schema's
 * `onDelete: "cascade"` on `capsule.wallId` (see
 * `drizzle/schema.ts:262-264`) takes care of wiping the wall's child
 * capsules and their `capsuleContent` / `recipient` /
 * `notification` rows; this handler only removes the `wall` row
 * itself.
 *
 * Authorization is two-stage:
 *
 *   1. `requireManagedWall` from `lib/wall-access.ts` returns the
 *      `wall` row only if the viewer is the organizer. Non-organizers
 *      and missing walls both look like `null` to the caller — we map
 *      that to a 404, per AGENTS.md's "don't leak wall existence to
 *      non-organizers" rule.
 *
 *   2. Inside the transaction we re-check the distinct contributor
 *      count and refuse with a 409 if anyone besides the organizer
 *      has added a capsule. The organizer's OWN contributions are
 *      allowed (count === 1 == just them; their capsules
 *      cascade-delete with the wall). The inside-tx re-check also
 *      closes the race where a second organizer cancels and a
 *      contributor sneaks in between the auth check and the delete.
 *
 * On success we return 204 with no body, matching the convention
 * `DELETE /api/capsules/[id]` established at
 * `app/api/capsules/[id]/route.ts:307`.
 *
 * UploadThing files for the deleted capsules are intentionally left
 * as orphans — this matches the existing capsule-delete precedent
 * and avoids taking a new dependency on UTApi in v1. PRD §5 has data
 * retention as an open question; addressing that is a follow-up.
 */
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { capsule, wall } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { requireManagedWall } from "@/lib/wall-access";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Stage 1: organizer gate. Returns null for non-organizers and for
  // missing walls — both 404 here, per AGENTS.md.
  const existing = await requireManagedWall(id, session.id);
  if (!existing) {
    return NextResponse.json({ error: "Wall not found" }, { status: 404 });
  }

  try {
    await db.transaction(async (tx) => {
      // Stage 2: re-check the distinct contributor count inside the
      // transaction. A second client could have added a capsule
      // between the auth check and now; this query also closes the
      // race where two organizers delete concurrently (one wins, the
      // other sees the wall already gone and falls through to the
      // `existing === null` branch above on the next request).
      const [row] = await tx
        .select({
          distinctOwners: sql<number>`count(distinct ${capsule.ownerId})::int`,
        })
        .from(capsule)
        .where(eq(capsule.wallId, id));
      const distinctOwners = Number(row?.distinctOwners ?? 0);
      if (distinctOwners > 1) {
        // Throw a marker error so the outer catch can map it to 409
        // without us having to inspect thrown values by string match.
        // (Throwing aborts the transaction; nothing is deleted.)
        throw new WallHasContributorsError(distinctOwners);
      }

      // Belt-and-braces ownership guard: only delete if the wall
      // still belongs to the session user. Cheap insurance against
      // any future transfer flow that might race with this delete.
      await tx
        .delete(wall)
        .where(and(eq(wall.id, id), eq(wall.createdBy, session.id)));
    });
  } catch (err) {
    if (err instanceof WallHasContributorsError) {
      return NextResponse.json(
        {
          error:
            "This wall has contributions from other people. Ask them to remove their capsules first, or contact support.",
        },
        { status: 409 },
      );
    }
    // Mirror the existing capsule-delete route's outer catch: surface
    // any unhandled throw (DB down, missing column, etc.) as a JSON
    // 500 the client can show, instead of Next's opaque error page.
    const message = err instanceof Error ? err.message : "Unknown server error";
    const detail =
      err instanceof Error && process.env.NODE_ENV !== "production"
        ? { stack: err.stack }
        : undefined;
    console.error("DELETE /api/walls/[id] failed:", err);
    return NextResponse.json(
      { error: `Server error: ${message}`, detail },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

/**
 * Internal marker. Thrown from inside the delete transaction to abort
 * it cleanly when a gate fails; the outer catch turns this into a
 * 409 response. Kept as a class so `instanceof` works without
 * relying on string matching.
 */
class WallHasContributorsError extends Error {
  constructor(public readonly distinctOwners: number) {
    super(
      `Wall has ${distinctOwners} distinct contributors; refusing to delete.`,
    );
    this.name = "WallHasContributorsError";
  }
}
