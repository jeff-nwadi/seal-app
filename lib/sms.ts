/**
 * Transactional SMS — Twilio.
 *
 * Why Twilio: AGENTS.md mandates Twilio for SMS. Twilio is the de-facto
 * standard for programmatic SMS in a Node/Next.js context — it has a
 * first-party Node SDK, supports international numbers, and the free
 * trial tier is enough for the v1 dev/testing loop.
 *
 * Dev fallback: if any of TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
 * TWILIO_FROM_NUMBER is missing, `sendSms` logs the body to the server
 * console and returns `{ ok: true, preview: "logged..." }`. This mirrors
 * `lib/email.ts` so the cron-driven flow is end-to-end testable on a
 * machine with no Twilio configured.
 *
 * Production note: Twilio numbers are region-bound (a US `TWILIO_FROM_NUMBER`
 * can only send to recipients in the same country tier by default; geo-
 * permissions must be enabled for international traffic). We don't try
 * to validate recipient country here — Twilio returns a clear error
 * code if the destination isn't permitted, and we surface that text
 * in the `notification.failureReason` column.
 */
import twilio, { type Twilio } from "twilio";

type SendArgs = {
  /** Destination phone number, ideally E.164 (e.g. +14155552671). */
  to: string;
  /** SMS body. Twilio segments at 160 GSM-7 chars, 70 UCS-2 chars. */
  body: string;
};

function isConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

// Cache the Twilio client. The SDK is built around a single REST client
// (auth + http + retries), so re-creating it per send is wasteful and
// can trip Twilio's per-second rate limits.
let cachedClient: Twilio | null = null;
function getClient(): Twilio | null {
  if (!isConfigured()) return null;
  if (cachedClient) return cachedClient;
  cachedClient = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );
  return cachedClient;
}

/**
 * Send a single SMS. Returns a tagged result so the caller can record
 * a `notification` row with the failure reason without try/catch
 * boilerplate. In dev with no Twilio configured, the body is logged
 * to the server console and reported as "ok" (the dev wants to see the
 * payload, not get a failure).
 *
 * Never throws — Twilio errors are caught and returned in the
 * `{ ok: false, reason }` shape so the cron can record them and move
 * on to the next recipient.
 */
export async function sendSms(
  args: SendArgs,
): Promise<{ ok: true; preview?: string } | { ok: false; reason: string }> {
  if (!args.to) return { ok: false, reason: "Recipient has no phone number" };
  if (!args.body) return { ok: false, reason: "Empty SMS body" };

  if (!isConfigured()) {
    console.info(
      `[sms:dev] → ${args.to}\n  body: ${args.body.slice(0, 300)}${args.body.length > 300 ? "…" : ""}`,
    );
    return { ok: true, preview: "logged to dev server console" };
  }

  const client = getClient()!;
  try {
    await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: args.to,
      body: args.body,
    });
    return { ok: true };
  } catch (error) {
    // Twilio errors have a `code` (e.g. 21211 invalid 'To'), `message`,
    // and `moreInfo` URL. We surface the message + code so the operator
    // can spot the most common issue (invalid phone format) without
    // diving into Twilio's API docs.
    const reason =
      error instanceof Error
        ? `${(error as { code?: number }).code ? `code ${(error as { code?: number }).code}: ` : ""}${error.message}`
        : String(error);
    console.error("[sms] sendSms failed", reason);
    return { ok: false, reason };
  }
}
