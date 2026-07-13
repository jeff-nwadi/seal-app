
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through the auth API itself — Better Auth handles its own
  // unauthenticated requests (sign-in, sign-up, verify, reset).
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const sessionToken = getSessionCookie(request);

  // If the user is logged in, prevent them from accessing landing and authentication pages,
  // redirecting them to the dashboard.
  const authRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];
  if (sessionToken && authRoutes.includes(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = ""; // clear query params
    return NextResponse.redirect(dashboardUrl);
  }

  // Gate the dashboard and capsule pages.
  const protectedRoutes = ["/dashboard", "/capsules"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !sessionToken) {
    // No session — redirect to /sign-in with the original path so we can
    // bounce back after sign-in.
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match every path except static assets, the Next.js internals, and
  // the Better Auth catch-all. The exclusion of `/api/auth` is what
  // makes unauthenticated users able to hit /api/auth/sign-in/email.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
