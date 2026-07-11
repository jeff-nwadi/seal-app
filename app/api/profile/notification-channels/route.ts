/**
 * GET  /api/profile/notification-channels
 * PATCH /api/profile/notification-channels
 *
 * Read or update the signed-in user's notification channel preferences.
 * The columns live on the `user` table (see `drizzle/schema.ts`); this
 * route is the only place outside of `getSession()` that writes them.
 *
 * Validation: at least one channel must remain on. The settings page
 * copy promises the user "at least one channel must be on" — refusing
 * to save an all-off state keeps the promise from being broken silently
 * (and avoids a degenerate "deliver nowhere" capsule delivery).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { getSession } from "@/lib/auth";

const channelsSchema = z
  .object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  })
  .refine((c) => c.email || c.sms || c.push, {
    message: "At least one notification channel must be on.",
  });

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    email: session.notifyEmail,
    sms: session.notifySms,
    push: session.notifyPush,
  });
}

export async function PATCH(request: NextRequest) {
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

  const parsed = channelsSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json(
      { error: firstIssue, issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { email, sms, push } = parsed.data;
  await db
    .update(user)
    .set({ notifyEmail: email, notifySms: sms, notifyPush: push })
    .where(eq(user.id, session.id));

  return NextResponse.json({ email, sms, push }, { status: 200 });
}
