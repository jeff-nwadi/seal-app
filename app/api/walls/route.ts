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

  // Generate a unique slug. The base slug is derived from the name;
  // on duplicate-key we append "-2", "-3", … up to 10 attempts, then
  // fall back to a short random suffix.
  const base = slugify(name) || "wall";
  const candidates = [
    base,
    ...Array.from({ length: 9 }, (_, i) => `${base}-${i + 2}`),
    `${base}-${Math.random().toString(36).slice(2, 6)}`,
  ];

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
      // 23505 = unique_violation in Postgres. Retry the next candidate.
      // We do a string check rather than importing the pg codes module.
      if (
        err instanceof Error &&
        !/duplicate key|unique constraint/i.test(err.message)
      ) {
        throw err;
      }
    }
  }

  if (!inserted) {
    console.error("wall create: all slug candidates collided", lastError);
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
}
