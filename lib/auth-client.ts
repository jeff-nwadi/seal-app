/**
 * Better Auth client (browser).
 *
 * Used by Client Components to call sign-in / sign-up / sign-out / update
 * from inside the React tree. Reads its `baseURL` from the public env var
 * so the browser can build correct absolute URLs.
 *
 * We re-export `signIn`, `signUp`, `signOut`, `useSession`, `updateUser`
 * for convenience — the rest of the client (`forgetPassword`,
 * `resetPassword`, etc.) is accessed via the `authClient` object directly.
 */
"use client";

import { createAuthClient } from "better-auth/react";
import { resolveBaseUrl } from "@/lib/base-url";

export const authClient = createAuthClient({
  // Better Auth's URL parser requires a full URL with a protocol.
  // The env var on Vercel is often a bare host (e.g. "my-app.vercel.app")
  // with a stray newline from copy-paste; `resolveBaseUrl` handles both
  // cases. See `lib/base-url.ts` for the resolution order.
  baseURL: resolveBaseUrl(),
});

export const { signIn, signUp, signOut, useSession, updateUser } = authClient;
