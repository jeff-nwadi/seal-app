
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through the auth API itself — Better Auth handles its own
  // unauthenticated requests (sign-in, sign-up, verify, reset).
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Only gate the dashboard. The auth pages (/sign-in, /sign-up,
  // /forgot-password, /reset-password, /verify-email) must remain
  // reachable while the user is signed out.
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Cheap session-presence check before we let the request hit a
  // server component. The server-side `requireSession` re-validates
  // the cookie and is the real gate — this is just to short-circuit
  // unauthenticated traffic and produce a clean redirect.
  //
  // We use Better Auth's `getSessionCookie` helper rather than a hard-
  // coded cookie name because Better Auth prefixes the session cookie
  // with `__Secure-` on HTTPS origins (e.g. Vercel production). A bare
  // `request.cookies.has("better-auth.session_token")` check would
  // miss the `__Secure-better-auth.session_token` cookie that the
  // browser actually sends in production, so an authenticated user
  // would get bounced back to /sign-in even though login succeeded.
  const sessionToken = getSessionCookie(request);
  if (sessionToken) {
    return NextResponse.next();
  }

  // No session — redirect to /sign-in with the original path so we can
  // bounce back after sign-in.
  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/sign-in";
  signInUrl.search = `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(signInUrl);
}

export const config = {
  // Match every path except static assets, the Next.js internals, and
  // the Better Auth catch-all. The exclusion of `/api/auth` is what
  // makes unauthenticated users able to hit /api/auth/sign-in/email.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
