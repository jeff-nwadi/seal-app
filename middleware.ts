
import { NextResponse, type NextRequest } from "next/server";

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

  // The presence of the Better Auth session cookie is a cheap check; the
  // server-side `requireSession` re-validates it (and is the real gate).
  // The cookie name is `better-auth.session_token` by default. We avoid
  // importing Better Auth here so the middleware stays a thin edge
  // function — import cost on every request would be significant.
  const hasSession = request.cookies.has("better-auth.session_token");
  if (hasSession) {
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
