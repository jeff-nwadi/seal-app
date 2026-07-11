/**
 * POST /api/cron/deliver
 *
 * Vercel Cron polls this endpoint to deliver due private capsules.
 * On the Pro plan this is a single entry running every 10 minutes
 * (the schedule "every 10 min"); on Hobby the per-cron interval is
 * capped at once per day, so vercel.json registers 24 separate
 * crons, one at each hour ("0 0..23 * * *"), to approximate the
 * once-per-hour delivery cadence. Each individual cron expression
 * is once-per-day and Hobby allows up to 100 cron jobs per project,
 * so this fits.
 *
 * The job:
 *   1. Takes a Postgres advisory lock (pg_try_advisory_lock) so two
 *      adjacent-hour crons whose invocations drift into the same
 *      minute (Vercel's Hobby accuracy is plus or minus 59 min per
 *      cron) cannot process the same due rows in parallel and
 *      double-send. The second cron bails out with 200 + "skipped"
 *      and the first delivers everything; on a clean run only one
 *      cron holds the lock at a time and the others are no-ops.
 *   2. Reads the set of due private capsules via getDueCapsules
 *      (this is the gate; wall-bound capsules are NOT delivered per
 *      recipient here — the wall page IS the delivery, and the seal
 *      guarantees the page is hidden until openDate).
 *   3. For each (capsule, recipient) pair, attempts to send via the
 *      recipient's channel. Currently only email is wired (SMS and
 *      push land in v1.1).
 *   4. Records the outcome in the notification table.
 *   5. Marks the capsule delivered once all its recipients succeed
 *      (or failed if every channel failed for at least one recipient).
 *
 * Auth: protected by Vercel's CRON_SECRET header. Vercel sets
 * "Authorization: Bearer <CRON_SECRET>" on every cron request; we
 * reject any other caller. In local dev we allow unauthenticated
 * requests so you can curl the route to test it.
 */
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getDueCapsules, markCapsuleDelivered, markCapsuleFailed, recordNotification } from "@/lib/wall-access";
import { sendCapsuleEmail } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Fixed lock key for the deliver job. The value is arbitrary — any
 * signed 64-bit int works — but it must be the same across every
 * deliver-job invocation so adjacent-hour crons contend for the same
 * lock. Using a stable key (instead of e.g. hashing the current hour)
 * also means a single mutex per Vercel function instance, which is
 * the intent: at most one deliver sweep runs at a time globally.
 */
const DELIVER_LOCK_KEY = 0x5345414c; // 'SEAL' in ASCII

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

  // Try to grab the global deliver lock. If another deliver run is
  // already in progress (e.g. two hourly crons firing in the same
  // minute), bail out cleanly. The advisory lock is session-scoped,
  // and we release it explicitly on the way out.
  const [lockRow] = await db.execute<{ pg_try_advisory_lock: boolean }>(
    sql`SELECT pg_try_advisory_lock(${DELIVER_LOCK_KEY})`,
  );
  const locked = lockRow?.pg_try_advisory_lock === true;
  if (!locked) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Another deliver job is already running.",
    });
  }

  const start = Date.now();
  try {
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
  } finally {
    // Release the lock so the next cron's invocation can proceed.
    // If the function instance dies between acquiring and releasing
    // the lock, Postgres releases session locks on connection close
    // automatically, so we can't deadlock the system.
    await db.execute(
      sql`SELECT pg_advisory_unlock(${DELIVER_LOCK_KEY})`,
    );
  }
}

// Vercel Cron also calls GET for some schedules; alias it.
export const GET = POST;
