/**
 * Better Auth catch-all route.
 *
 * All `/api/auth/*` requests — sign-up, sign-in, sign-out, verify-email,
 * reset-password, etc. — are handled by `toNextJsHandler(auth)`. The file
 * is the entire route: a GET and a POST export from a single helper.
 *
 * See https://www.better-auth.com/docs/installation#mount-handler
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
