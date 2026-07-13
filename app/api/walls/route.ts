/**
 * POST /api/walls
 *
 * Creates a new wall. Auth is required (the organizer is the session
 * user). The `slug` is generated from the name and may collide — the
 * route retries with a numeric suffix on duplicate-key errors.
 *
 * The openDate is validated to be in the future; the form is a Server
 * Component so this is the second line of defense (the first is the
 * `min` attribute on the `<input type="datetime-local">`).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  wall,
  type WallInsert,
  type WallRow,
  type WallVisibilityValue,
} from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/wall-access";

const wallCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(500).optional(),
  openDate: z.string().datetime(),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = wallCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { name, description, openDate, visibility } = parsed.data;
    const openAt = new Date(openDate);
    if (Number.isNaN(openAt.getTime()) || openAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Open date must be in the future." },
        { status: 422 },
      );
    }

    // Generate a unique slug. The base is derived from the name; if it
    // collides, we append a short random suffix and try again — but
    // only ONCE. Sequential retry loops (one attempt per candidate) made
    // this route balloon to 27+ seconds on the serverless cold path
    // (see git history: 11 round-trips to Neon × cold-start latency).
    // One insert on the happy path, two on the unlucky collision path.
    const base = slugify(name) || "wall";
    const suffixes = ["", `-${randomSuffix()}`];
    const candidates = suffixes.map((s) => `${base}${s}`);

    let inserted: WallRow | null = null;
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        const values: WallInsert = {
          name,
          description: description ?? null,
          slug: candidate,
          openDate: openAt,
          createdBy: session.id,
          visibility: visibility as WallVisibilityValue,
        };
        const rows = await db.insert(wall).values(values).returning();
        if (rows[0]) {
          inserted = rows[0];
          break;
        }
      } catch (err) {
        lastError = err;
        // Only swallow unique-constraint violations (Postgres 23505).
        // Anything else — connection drop, auth, schema mismatch — must
        // surface to the route's 500 handler, not be silently retried.
        if (!isUniqueViolation(err)) throw err;
      }
    }

    if (!inserted) {
      console.error("wall create: both slug candidates collided", lastError);
      return NextResponse.json(
        { error: "Could not generate a unique slug. Try a different name." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        id: inserted.id,
        slug: inserted.slug,
        name: inserted.name,
        openDate: inserted.openDate.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    // Outer catch so any unhandled throw (DB down, missing column,
    // permission, etc.) returns a JSON body the client can show, instead
    // of Next.js's opaque 500 page. The stack still hits Vercel logs.
    const message = err instanceof Error ? err.message : "Unknown server error";
    const detail =
      err instanceof Error && process.env.NODE_ENV !== "production"
        ? { stack: err.stack }
        : undefined;
    console.error("POST /api/walls failed:", err);
    return NextResponse.json(
      { error: `Server error: ${message}`, detail },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Short, URL-safe random suffix. 6 chars from [a-z0-9] — 36^6 ≈ 2.2B
 * combinations, so a single retry has effectively zero collision chance.
 */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Detects Postgres unique-constraint violations. The `postgres` driver
 * surfaces these as errors with `code: "23505"` (or in some wrappers,
 * the message contains "duplicate key"/"unique constraint" — we check
 * both to be defensive against driver versions).
 */
function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "23505") return true;
  if (typeof e.message === "string") {
    return /duplicate key|unique constraint/i.test(e.message);
  }
  return false;
}
