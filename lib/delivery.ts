/**
 * Capsule delivery — channel-agnostic send.
 *
 * The cron job calls `sendCapsuleEmail` for each (capsule, recipient)
 * pair. The function takes the content rows and builds the email body
 * inline (text + image links, no media inlining — that's a v1.1 polish).
 *
 * The actual transport is `lib/email.ts` (Gmail SMTP in dev, swappable
 * in prod). A failure to send does NOT throw — the cron records the
 * `notification` row as `failed` with the error message and moves on.
 */
import { sendMail } from "@/lib/email";
import type {
  CapsuleContentRow,
  CapsuleRow,
  RecipientRow,
} from "@/drizzle/schema";

const FROM_ADDRESS = (() => {
  const user = process.env.GMAIL_USER;
  return user ? `Seal via ${user} <${user}>` : "Seal <noreply@seal.app>";
})();

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000";

/**
 * Build the subject + HTML body for a private capsule email.
 *
 * Subject is `Sealed message from <owner>: <title>`. We don't put the
 * title in the subject line alone — "Sealed message from" primes the
 * recipient for the format and the owner name gives them context for
 * the right message (since they may receive capsules from multiple
 * people, especially on the email channel).
 */
export function buildCapsuleEmail(args: {
  ownerName: string;
  capsule: CapsuleRow;
  content: CapsuleContentRow[];
  recipient: RecipientRow;
}) {
  const subject = `Sealed message from ${args.ownerName}: ${args.capsule.title}`;

  const textBlocks = args.content
    .filter((c) => c.contentType === "text" && c.contentText)
    .map((c) => c.contentText!)
    .join("\n\n---\n\n");

  const mediaBlocks = args.content
    .filter((c) => c.contentType !== "text" && c.contentUrl)
    .map((c) => {
      const label = c.contentType.charAt(0).toUpperCase() + c.contentType.slice(1);
      return `<p style="margin:0 0 12px 0;"><a href="${c.contentUrl}" style="color:#3513A5;text-decoration:underline;">${label}: ${escapeHtml(args.capsule.title)}</a></p>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#000000;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 0 24px 0;">
                <span style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#3513A5;font-weight:500;">Seal</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 0;font-size:24px;font-weight:700;line-height:1.25;">
                ${escapeHtml(args.capsule.title)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;font-size:14px;color:#6b6b73;">
                A sealed message from ${escapeHtml(args.ownerName)}.
              </td>
            </tr>
            ${
              textBlocks
                ? `<tr><td style="padding:0 0 24px 0;font-size:16px;line-height:1.6;color:#000000;white-space:pre-wrap;">${escapeHtml(textBlocks)}</td></tr>`
                : ""
            }
            ${
              mediaBlocks
                ? `<tr><td style="padding:0 0 24px 0;">${mediaBlocks}</td></tr>`
                : ""
            }
            <tr>
              <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;font-size:12px;color:#6b6b73;line-height:1.5;">
                Sent via Seal — sealed on creation, delivered on the date you specified. Visit <a href="${PUBLIC_BASE_URL}" style="color:#3513A5;">seal.app</a> to send your own.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Sealed message from ${args.ownerName}: ${args.capsule.title}\n\n${textBlocks}${
    args.content
      .filter((c) => c.contentType !== "text" && c.contentUrl)
      .map((c) => `\n[${c.contentType}]: ${c.contentUrl}`)
      .join("")
  }`;

  return { subject, html, text };
}

/**
 * Send the capsule email. Returns `{ ok: true }` on success, or
 * `{ ok: false, reason }` on failure. Never throws — the cron records
 * the outcome and moves on.
 */
export async function sendCapsuleEmail(args: {
  ownerName: string;
  capsule: CapsuleRow;
  content: CapsuleContentRow[];
  recipient: RecipientRow;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (args.recipient.channel !== "email") {
    return { ok: false, reason: `Recipient channel is ${args.recipient.channel}, not email` };
  }
  if (!args.recipient.email) {
    return { ok: false, reason: "Recipient has no email address" };
  }
  const { subject, html, text } = buildCapsuleEmail(args);
  try {
    const result = await sendMail({
      from: FROM_ADDRESS,
      to: args.recipient.email,
      subject,
      html,
      text,
    });
    if (!result.ok) return { ok: false, reason: result.reason };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
