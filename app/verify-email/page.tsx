/**
 * Email verification page (Server Component).
 *
 * Better Auth appends a `?token=…` query param to the verification URL
 * when it sends the email. This page is the destination of that link —
 * it calls `auth.api.verifyEmail` server-side, which marks the user as
 * verified, then renders the success or failure state.
 *
 * After a successful verification we show a CTA to sign in. We do NOT
 * auto-sign-in here — Better Auth's verify endpoint doesn't issue a
 * session cookie, just flips the flag.
 */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Seal } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata = {
  title: "Verify email — Seal",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Shell>
        <Failure
          title="Missing verification link"
          body="The link you followed looks malformed. Request a new verification email from the sign-in page."
        />
      </Shell>
    );
  }

  let error: unknown = null;
  try {
    await auth.api.verifyEmail({
      headers: await headers(),
      query: { token },
    });
  } catch (e) {
    error = e;
  }

  if (error) {
    return (
      <Shell>
        <Failure
          title="Verification link is invalid or expired"
          body="Verification links expire after 1 hour. Sign in to request a fresh one."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Success />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16 sm:py-24">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Seal className="size-12 text-primary" />
        {children}
      </div>
    </div>
  );
}

function Success() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <CheckCircle2 className="size-12 text-primary" aria-hidden />
      <h1 className="text-2xl font-bold tracking-tight">Email verified</h1>
      <p className="text-sm text-muted-foreground">
        Your account is unlocked. Sign in to start sealing messages.
      </p>
      <ButtonLink href="/sign-in" size="lg" className="rounded-full">
        Sign in
      </ButtonLink>
    </div>
  );
}

function Failure({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <XCircle className="size-12 text-destructive" aria-hidden />
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link
        href="/sign-in"
        className="text-sm text-primary hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
