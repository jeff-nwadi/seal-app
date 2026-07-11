/**
 * Auth stub. Replace with Better Auth (`auth.api.getSession`) once
 * `drizzle/schema.ts` and `lib/auth.ts` are wired.
 *
 * See AGENTS.md: "Better Auth for authentication/sessions (backed by the
 * users table in drizzle/schema.ts)".
 */
export interface SessionUser {
  id: string
  name: string
  email: string
}

const STUB_USER: SessionUser = {
  id: "user_stub_1",
  name: "Ada Lovelace",
  email: "ada@seal.app",
}

export async function getSession(): Promise<SessionUser> {
  // TODO(auth): replace with `await auth.api.getSession({ headers })` from Better Auth.
  return STUB_USER
}
