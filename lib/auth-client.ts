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

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signUp, signOut, useSession, updateUser } = authClient;
