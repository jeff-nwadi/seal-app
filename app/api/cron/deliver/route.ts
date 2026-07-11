/**
 * POST /api/cron/deliver
 *
 * Vercel Cron polls this endpoint every 10 minutes (per `vercel.json`).
 * The job:
 *   1. Reads the set of due private capsules via `getDueCapsules`
 *      (this is the gate; wall-bound capsules are NOT delivered per
 *      recipient here — the wall page IS the delivery, and the seal
 *      guarantees the page is hidden until `openDate`).
 *   2. For each (capsule, recipient) pair, attempts to send via the
 *      recipient's `channel`. Currently only `email` is wired (SMS and
 *      push land in v1.1).
 *   3. Records the outcome in the `notification` table.
 *   4. Marks the capsule `delivered` once all its recipients succeed
 *      (or `failed` if every channel failed for at least one recipient).
 *
 * Auth: protected by Vercel's `CRON_SECRET` header. Vercel sets
 * `Authorization: Bearer <CRON_SECRET>` on every cron request; we
 * reject any other caller. In local dev we allow unauthenticated
 * requests so you can `curl` the route to test it.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getDueCapsules, markCapsuleDelivered, markCapsuleFailed, recordNotification } from "@/lib/wall-access";
import { sendCapsuleEmail } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isCronAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // In dev, allow unauthenticated calls so the cron can be exercised
    // locally with `curl http://localhost:3000/api/cron/deliver`.
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const due = await getDueCapsules();
  const results: Array<{
    capsuleId: string;
    title: string;
    recipientCount: number;
    sent: number;
    failed: number;
    status: "delivered" | "partial" | "failed";
  }> = [];

  for (const dueRow of due) {
    let sent = 0;
    let failed = 0;
    let lastReason: string | null = null;

    for (const r of dueRow.recipients) {
      // Per-AGENTS.md, only the email channel is wired in step 1. We
      // still record a `notification` row for sms / push so the audit
      // trail reflects "we tried, the channel isn't built yet".
      if (r.channel !== "email") {
        const reason = `Channel "${r.channel}" is not yet wired — coming in v1.1.`;
        await recordNotification({
          recipientId: r.id,
          channel: r.channel,
          status: "failed",
          scheduledFor: dueRow.capsule.deliveryDate ?? new Date(),
          sentAt: null,
          failureReason: reason,
        });
        failed++;
        lastReason = reason;
        continue;
      }

      const outcome = await sendCapsuleEmail({
        ownerName: dueRow.ownerName,
        capsule: dueRow.capsule,
        content: dueRow.content,
        recipient: r,
      });

      if (outcome.ok) {
        await recordNotification({
          recipientId: r.id,
          channel: "email",
          status: "sent",
          scheduledFor: dueRow.capsule.deliveryDate ?? new Date(),
          sentAt: new Date(),
          failureReason: null,
        });
        sent++;
      } else {
        await recordNotification({
          recipientId: r.id,
          channel: "email",
          status: "failed",
          scheduledFor: dueRow.capsule.deliveryDate ?? new Date(),
          sentAt: null,
          failureReason: outcome.reason,
        });
        failed++;
        lastReason = outcome.reason;
      }
    }

    // Per-recipient outcome determines the capsule status:
    //   - all sent → delivered
    //   - all failed → failed
    //   - mixed      → delivered (we mark the row as delivered once
    //                  *any* recipient got the message; a partial-fail
    //                  dashboard item is a v1.1 polish)
    if (sent > 0 && failed === 0) {
      await markCapsuleDelivered(dueRow.capsule.id);
      results.push({
        capsuleId: dueRow.capsule.id,
        title: dueRow.capsule.title,
        recipientCount: dueRow.recipients.length,
        sent,
        failed,
        status: "delivered",
      });
    } else if (sent > 0 && failed > 0) {
      await markCapsuleDelivered(dueRow.capsule.id);
      results.push({
        capsuleId: dueRow.capsule.id,
        title: dueRow.capsule.title,
        recipientCount: dueRow.recipients.length,
        sent,
        failed,
        status: "partial",
      });
    } else {
      await markCapsuleFailed(dueRow.capsule.id, lastReason ?? "All recipients failed");
      results.push({
        capsuleId: dueRow.capsule.id,
        title: dueRow.capsule.title,
        recipientCount: dueRow.recipients.length,
        sent,
        failed,
        status: "failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - start,
    capsulesConsidered: due.length,
    results,
  });
}

// Vercel Cron also calls GET for some schedules; alias it.
export const GET = POST;
