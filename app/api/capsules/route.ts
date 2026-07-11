/**
 * POST /api/capsules
 *
 * Creates a new capsule. The request payload is validated against
 * `CapsuleCreateSchema`; on success the capsule is inserted with
 * `status = 'scheduled'` (or `'draft'` for the save-draft path),
 * the content rows are inserted, and (for private capsules) the
 * recipients are inserted.
 *
 * AGENTS.md: "Delivery is cron-driven — don't add synchronous 'send now'
 * logic to the capsule creation route." We only schedule here; the cron
 * picks the row up at `delivery_date`.
 *
 * PRD §2 acceptance criteria honored:
 *   - Story 1: `deliveryDate` is required for private capsules and
 *     must be in the future (validated by zod with a refine).
 *   - Story 2: `contentType` is one of text|image|audio|video; at
 *     least one content row is required.
 *   - Story 5: at least one channel must be selected per recipient.
 *   - Story 7: the new row is `scheduled` — and the route never edits
 *     or deletes delivered rows.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  capsule,
  capsuleContent,
  recipient,
  wall,
  type CapsuleInsert,
  type CapsuleContentInsert,
  type DeliveryChannelValue,
  type RecipientInsert,
} from "@/drizzle/schema";
import { getSession } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const contentTypeSchema = z.enum(["text", "image", "audio", "video"]);
const channelSchema = z.enum(["email", "sms", "push"]);

const contentItemSchema = z
  .object({
    contentType: contentTypeSchema,
    contentText: z.string().max(50_000).optional(),
    contentUrl: z.string().url().optional(),
    uploadthingKey: z.string().optional(),
  })
  .refine(
    (c) => {
      if (c.contentType === "text") {
        return typeof c.contentText === "string" && c.contentText.trim().length > 0;
      }
      return typeof c.contentUrl === "string" && c.contentUrl.length > 0;
    },
    {
      message:
        "Text content needs contentText; media content needs a contentUrl from UploadThing.",
    },
  );

const recipientInputSchema = z
  .object({
    name: z.string().max(80).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(40).optional(),
    channel: channelSchema,
  })
  .refine(
    (r) =>
      (r.channel === "email" && typeof r.email === "string") ||
      (r.channel === "sms" && typeof r.phone === "string") ||
      (r.channel === "push" && (typeof r.email === "string" || typeof r.phone === "string")),
    {
      message: "Each recipient needs an email (for email/push) or phone (for sms/push).",
    },
  );

const capsuleCreateSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(120),
    /** Optional wallId — when set, the capsule is a wall contribution. */
    wallId: z.string().uuid().optional(),
    /**
     * Required for private (wallId omitted) capsules; ignored for wall
     * contributions (the wall's openDate is the delivery moment).
     */
    deliveryDate: z.string().datetime().optional(),
    content: z.array(contentItemSchema).min(1).max(10),
    /**
     * Required for private capsules. Wall contributions are addressed to
     * "the wall" — no per-capsule recipients, the wall page is the
     * notification point. The form hides the recipient picker when the
     * "contribute to a wall" path is active.
     */
    recipients: z.array(recipientInputSchema).optional(),
    /** Defaults to "scheduled". A draft is a work-in-progress. */
    status: z.enum(["draft", "scheduled"]).default("scheduled"),
  })
  .refine(
    (d) => {
      if (d.wallId) {
        // Wall contribution: deliveryDate is ignored.
        return true;
      }
      // Private capsule: deliveryDate required and must be future.
      if (!d.deliveryDate) return false;
      const t = Date.parse(d.deliveryDate);
      if (Number.isNaN(t)) return false;
      return t > Date.now();
    },
    {
      message:
        "Private capsules need a delivery date in the future. Wall contributions inherit the wall's open date.",
      path: ["deliveryDate"],
    },
  )
  .refine(
    (d) => {
      if (d.wallId) return true; // wall path: no per-capsule recipients
      if (d.status === "draft") return true; // drafts can be recipient-less
      return Array.isArray(d.recipients) && d.recipients.length > 0;
    },
    {
      message:
        "Private capsules need at least one recipient and channel before they can be scheduled.",
      path: ["recipients"],
    },
  );

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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

  const parsed = capsuleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }
  const input = parsed.data;

  // Wall preconditions. The form only lets you pick a wall you
  // organize or contribute to, but we re-verify server-side:
  //   - The wall must exist.
  //   - Private walls (reserved for v1.1) are inaccessible to non-organizers.
  //   - Once `openDate` has passed, the wall is sealed — we 409 to refuse
  //     late contributions.
  if (input.wallId) {
    const [w] = await db
      .select({
        id: wall.id,
        createdBy: wall.createdBy,
        openDate: wall.openDate,
        visibility: wall.visibility,
      })
      .from(wall)
      .where(eq(wall.id, input.wallId))
      .limit(1);
    if (!w) {
      return NextResponse.json({ error: "Wall not found" }, { status: 404 });
    }
    if (w.visibility === "private" && w.createdBy !== session.id) {
      // Don't leak the existence of a private wall to non-organizers.
      return NextResponse.json({ error: "Wall not found" }, { status: 404 });
    }
    if (w.openDate.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "This wall has already opened — contributions are closed." },
        { status: 409 },
      );
    }
  }

  // Use a transaction so the capsule + content + recipients land together.
  // If any insert fails, none of them do (a half-built capsule with no
  // content would be very confusing in the dashboard).
  const created = await db.transaction(async (tx) => {
    const capsuleValues: CapsuleInsert = {
      ownerId: session.id,
      wallId: input.wallId ?? null,
      title: input.title,
      deliveryDate:
        input.wallId
          ? null
          : input.deliveryDate
            ? new Date(input.deliveryDate)
            : null,
      status: input.status,
    };
    const [c] = await tx.insert(capsule).values(capsuleValues).returning();
    if (!c) throw new Error("Failed to insert capsule");

    if (input.content.length > 0) {
      const contentValues: CapsuleContentInsert[] = input.content.map(
        (item, idx) => ({
          capsuleId: c.id,
          contentType: item.contentType,
          contentText: item.contentText ?? null,
          contentUrl: item.contentUrl ?? null,
          uploadthingKey: item.uploadthingKey ?? null,
          sortOrder: idx,
        }),
      );
      await tx.insert(capsuleContent).values(contentValues);
    }

    if (input.recipients && input.recipients.length > 0) {
      const recipientValues: RecipientInsert[] = input.recipients.map((r) => ({
        capsuleId: c.id,
        name: r.name ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        channel: r.channel as DeliveryChannelValue,
      }));
      await tx.insert(recipient).values(recipientValues);
    }

    return c;
  });

  return NextResponse.json(
    {
      id: created.id,
      status: created.status,
      title: created.title,
    },
    { status: 201 },
  );
}

// Surface the schema so the client form can share the same validation
// rules if it wants to. Exported as a `type` so it doesn't bloat the
// client bundle with the zod object.
export type CapsuleCreatePayload = z.infer<typeof capsuleCreateSchema>;

// Re-export for tests / type-checking.
export { capsuleCreateSchema };
