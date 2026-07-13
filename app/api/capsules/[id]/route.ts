/**
 * PATCH /api/capsules/[id]
 * DELETE /api/capsules/[id]
 *
 * Edit + delete a single capsule owned by the current user. Per
 * AGENTS.md: a capsule can be edited or deleted only while its status
 * is `draft` or `scheduled`; `delivered` and `failed` are immutable.
 * The check is the same one `requireEditableCapsule` in
 * `lib/wall-access.ts` already performs — it returns `null` for
 * non-owners AND for delivered/failed rows, so we map that to 404
 * here per the AGENTS.md non-negotiable (don't leak capsule
 * existence to non-owners).
 *
 * Wall-bound capsules are sealed into a wall and owned by the wall,
 * not the user. Editing them would invalidate the wall's openDate
 * contract. We refuse with 409 to make the reason explicit (rather
 * than a 404 that suggests the capsule doesn't exist).
 *
 * Both handlers run inside a single `db.transaction` so the edit
 * lands atomically — same pattern as the create route
 * (`app/api/capsules/route.ts:199-241`).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  capsule,
  capsuleContent,
  recipient,
  notification,
  type CapsuleContentInsert,
  type DeliveryChannelValue,
  type RecipientInsert,
} from "@/drizzle/schema";
import { getSession } from "@/lib/auth";
import { requireEditableCapsule } from "@/lib/wall-access";

// ---------------------------------------------------------------------------
// Validation (shared with the create schema)
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

const capsuleUpdateSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(120),
    /**
     * Required for private (wallId omitted on the stored row) capsules;
     * ignored for wall contributions. The form sends the datetime as
     * an ISO string; we parse + validate in the refine below.
     */
    deliveryDate: z.string().datetime().optional(),
    content: z.array(contentItemSchema).min(1).max(10),
    recipients: z.array(recipientInputSchema).optional(),
  })
  .refine(
    (d) => {
      // deliveryDate is required + in-the-future for private capsules.
      // The wall-bound case is filtered out upstream (409 before
      // reaching validation), so by the time we get here the capsule
      // is private and `deliveryDate` is required.
      if (!d.deliveryDate) return false;
      const t = Date.parse(d.deliveryDate);
      if (Number.isNaN(t)) return false;
      return t > Date.now();
    },
    {
      message: "Pick a future delivery date.",
      path: ["deliveryDate"],
    },
  )
  .refine(
    (d) => Array.isArray(d.recipients) && d.recipients.length > 0,
    {
      message: "Add at least one recipient and channel.",
      path: ["recipients"],
    },
  );

export type CapsuleUpdatePayload = z.infer<typeof capsuleUpdateSchema>;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * PATCH /api/capsules/[id]
 *
 * Edits a capsule in-place. We don't try to do a per-row diff; we
 * delete the existing content + recipient rows and re-insert the new
 * set. The form only ever holds one content row + N recipients, so
 * the replace-and-insert cost is tiny and it keeps the API surface
 * symmetric with POST.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = capsuleUpdateSchema.safeParse(body);
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

  // Editability gate: owner + status not in delivered/failed.
  // Returns null for non-owners AND for delivered/failed AND for
  // missing rows — we 404 all of those per AGENTS.md (don't leak
  // capsule existence to non-owners).
  const existing = await requireEditableCapsule(id, session.id);
  if (!existing) {
    return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
  }

  // Wall-bound capsules are sealed into the wall; editing them here
  // would invalidate the wall's openDate contract. 409 (not 404) so
  // the owner understands the row exists, just isn't editable here.
  if (existing.wallId !== null) {
    return NextResponse.json(
      {
        error:
          "This capsule is sealed into a wall — wall contributions can't be edited from the dashboard.",
      },
      { status: 409 },
    );
  }

  const updated = await db.transaction(async (tx) => {
    await tx
      .update(capsule)
      .set({
        title: input.title,
        deliveryDate: new Date(input.deliveryDate as string),
      })
      .where(eq(capsule.id, id));

    // Replace content rows. The form sends a single-element array;
    // this still works for multi-row content if a future iteration
    // grows the form.
    await tx.delete(capsuleContent).where(eq(capsuleContent.capsuleId, id));
    if (input.content.length > 0) {
      const contentValues: CapsuleContentInsert[] = input.content.map(
        (item, idx) => ({
          capsuleId: id,
          contentType: item.contentType,
          contentText: item.contentText ?? null,
          contentUrl: item.contentUrl ?? null,
          uploadthingKey: item.uploadthingKey ?? null,
          sortOrder: idx,
        }),
      );
      await tx.insert(capsuleContent).values(contentValues);
    }

    // Replace recipients.
    await tx.delete(recipient).where(eq(recipient.capsuleId, id));
    if (input.recipients && input.recipients.length > 0) {
      const recipientValues: RecipientInsert[] = input.recipients.map((r) => ({
        capsuleId: id,
        name: r.name ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        channel: r.channel as DeliveryChannelValue,
      }));
      const insertedRecipients = await tx.insert(recipient).values(recipientValues).returning();

      if (existing.status === "scheduled") {
        const notificationValues = insertedRecipients.map((r) => ({
          recipientId: r.id,
          channel: r.channel,
          status: "pending" as const,
          scheduledFor: new Date(input.deliveryDate as string),
        }));
        await tx.insert(notification).values(notificationValues);
      }
    }

    const [row] = await tx
      .select()
      .from(capsule)
      .where(eq(capsule.id, id))
      .limit(1);
    return row;
  });

  if (!updated) {
    // Shouldn't happen — we just updated it. Treat as 500 to surface
    // any transaction/post-update anomaly.
    return NextResponse.json(
      { error: "Capsule vanished during update." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      id: updated.id,
      status: updated.status,
      title: updated.title,
    },
    { status: 200 },
  );
}

/**
 * DELETE /api/capsules/[id]
 *
 * Hard delete. The schema's FK cascades on `capsuleContent.capsuleId`
 * and `recipient.capsuleId` (and `notification.recipientId` on the
 * recipient) take care of wiping the dependent rows; we only need
 * to remove the capsule row itself.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await requireEditableCapsule(id, session.id);
  if (!existing) {
    return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
  }

  if (existing.wallId !== null) {
    return NextResponse.json(
      {
        error:
          "This capsule is sealed into a wall — wall contributions can't be deleted from the dashboard.",
      },
      { status: 409 },
    );
  }

  await db.transaction(async (tx) => {
    // Re-check status inside the transaction so a concurrent update
    // that landed `delivered` between the gate and the delete can't
    // race past us.
    const [fresh] = await tx
      .select({ status: capsule.status, wallId: capsule.wallId })
      .from(capsule)
      .where(eq(capsule.id, id))
      .limit(1);
    if (!fresh) return;
    if (fresh.status === "delivered" || fresh.status === "failed") return;
    if (fresh.wallId !== null) return;

    await tx
      .delete(capsule)
      // Belt-and-braces: only delete if still owned by the session
      // user, in case the ownership check above raced with a transfer
      // (no transfer flow exists today, but this is cheap insurance).
      .where(and(eq(capsule.id, id), eq(capsule.ownerId, session.id)));
  });

  return new NextResponse(null, { status: 204 });
}
