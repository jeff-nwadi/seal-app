/**
 * Resolve the public base URL for Better Auth and the email templates.
 *
 * Why this exists: on Vercel the env var `NEXT_PUBLIC_BETTER_AUTH_URL` is
 * often set to a bare host (`seal-app-orcin.vercel.app\n`) — no protocol,
 * stray newline from a copy/paste. Better Auth's URL parser throws
 * `Invalid base URL` and the build fails. `lib/auth.ts` and
 * `lib/auth-client.ts` both go through this helper so we normalise
 * once in one place.
 *
 * Resolution order (first match wins):
 *   1. `NEXT_PUBLIC_BETTER_AUTH_URL` from env (local + production).
 *   2. Vercel-provided `VERCEL_PROJECT_PRODUCTION_URL` (production only).
 *   3. Vercel-provided `VERCEL_URL` (preview deployments).
 *   4. The hardcoded production URL — so login still works on Vercel
 *      even if every env var is missing. (See `PRODUCTION_BASE_URL`
 *      below — update it when the production domain changes.)
 *   5. `http://localhost:3000` as a last-resort dev default.
 *
 * Whatever string comes back is:
 *   - Trimmed of surrounding whitespace / newlines.
 *   - Prepended with `https://` if no protocol is present (Vercel
 *     domains are always https).
 *   - Stripped of any trailing slashes.
 *
 * The function is sync and pure; it's safe to call from both the
 * server (auth.ts) and the client (auth-client.ts) without async
 * ceremony. It does NOT throw — it falls through to the dev default
 * if the env var is missing, which keeps local dev working even
 * without the var set.
 */

/**
 * Hardcoded production base URL.
 *
 * Used as a last-resort fallback when no env var resolves to a valid
 * URL. Without this, a missing or malformed env var on Vercel leaves
 * the app unable to compute redirect URLs — the user clicks "Sign in",
 * Better Auth redirects to a relative path, and the session cookie
 * never gets set. Keep this in sync with the production domain.
 */
const PRODUCTION_BASE_URL = "https://seal-app-orcin.vercel.app"

export function resolveBaseUrl(): string {
  // Try each candidate, sanitising as we go.
  const candidates = [
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    PRODUCTION_BASE_URL,
    "http://localhost:3000",
  ]

  for (const raw of candidates) {
    if (!raw) continue
    const normalised = normaliseBaseUrl(raw)
    if (normalised) return normalised
  }

  // Unreachable: the dev default is always present, but TS doesn't know.
  return "http://localhost:3000"
}

/**
 * Sanitise a single candidate URL.
 *  - strip whitespace + newlines
 *  - prepend `https://` if no protocol is present
 *  - drop trailing slashes
 *  - return "" if the result still isn't a parseable URL
 */
function normaliseBaseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  // Drop trailing slashes (Better Auth treats them inconsistently).
  const noTrailing = withProtocol.replace(/\/+$/, "")
  try {
    // Validate the URL actually parses — we use the URL constructor as
    // a sanity check rather than for the final value.
    new URL(noTrailing)
    return noTrailing
  } catch {
    return ""
  }
}
