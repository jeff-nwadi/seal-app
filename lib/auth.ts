
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/drizzle/schema";
import { user } from "@/drizzle/schema";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      // Map the schema object explicitly so Better Auth can find the tables
      // even if the generated file uses different export names.
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ user, url });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ user, url });
    },
  },
  experimental: {
    joins: true,
  },
  // `nextCookies` MUST be the last plugin so it can wrap the response and
  // set the session cookie after the auth handler runs.
  plugins: [nextCookies()],
});

/**
 * Narrow shape used throughout the app. Keeps `components/dashboard-shell.tsx`
 * and the dashboard pages from importing Better Auth's wider `User` type
 * (which leaks the password hash, account rows, etc.).
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  /**
   * Notification channel preferences. The DB column is the source of
   * truth (see `drizzle/schema.ts`); we read the default `true/false`
   * explicitly so an older row written before the migration landed
   * doesn't surface `undefined` to a `<Switch checked={…} />`.
   */
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
}

/**
 * Read the current session. Returns `null` when there is no valid session —
 * callers in protected contexts use `requireSession()` instead, which
 * redirects on null.
 */
export async function getSession(): Promise<SessionUser | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result?.user) return null;
  // Better Auth's adapter returns the columns it knows about; the three
  // channel flags live in our Drizzle schema, not Better Auth's. Read
  // them straight from the DB on every session lookup — cheap (PK hit)
  // and avoids a second query in callers that need them.
  const rows = await db
    .select({
      notifyEmail: user.notifyEmail,
      notifySms: user.notifySms,
      notifyPush: user.notifyPush,
    })
    .from(user)
    .where(eq(user.id, result.user.id))
    .limit(1);
  const flags = rows[0];
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    emailVerified: result.user.emailVerified,
    // Coerce to boolean — a NULL (pre-migration row) becomes `true`
    // for email, `false` for sms/push, matching the schema defaults.
    notifyEmail: flags?.notifyEmail ?? true,
    notifySms: flags?.notifySms ?? false,
    notifyPush: flags?.notifyPush ?? false,
  };
}

/**
 * Read the current session or throw a redirect to `/sign-in`. Use in any
 * Server Component that must be authenticated (the dashboard layout, the
 * settings page, etc.). The `?from=…` query param lets the sign-in page
 * bounce the user back to where they were trying to go.
 */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    // Reading the current URL from the request headers — Next.js doesn't
    // expose a server-side `usePathname` equivalent without a hook, so we
    // reconstruct the `from` from the Referer header.
    const h = await headers();
    const from = h.get("x-pathname") ?? h.get("referer") ?? "/dashboard";
    redirect(`/sign-in?from=${encodeURIComponent(from)}`);
  }
  return user;
}
