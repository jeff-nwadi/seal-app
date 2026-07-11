/**
 * Transactional email — Gmail SMTP via Nodemailer.
 *
 * Why Gmail: AGENTS.md originally said "Resend" but the project doesn't own
 * a verified domain, and the user is in dev. Gmail SMTP works without a
 * custom domain — you authenticate with a Gmail address + a 16-char "App
 * Password" (generated at https://myaccount.google.com/apppasswords;
 * requires 2FA on the Google account).
 *
 * Dev fallback: if `GMAIL_USER` or `GMAIL_APP_PASSWORD` is unset, the
 * `send*` functions log the link to the server console instead of
 * dispatching SMTP. That keeps the smoke test working end-to-end on a
 * machine where no Gmail is configured — you copy the link from the
 * dev-server output and click it.
 *
 * Production note: Gmail's free tier caps at ~500 emails/day and isn't
 * meant for high-volume transactional mail. When this app goes live,
 * switch to a proper provider (Postmark, SendGrid, Amazon SES, Resend
 * with a verified domain). The `sendVerificationEmail` /
 * `sendPasswordResetEmail` signatures are deliberately provider-agnostic
 * so swapping the transport is a one-file change.
 */
import nodemailer, { type Transporter } from "nodemailer";

type SendArgs = {
  user: { name: string; email: string };
  url: string;
};

// In dev we use a "Seal via <gmail-address>" identity. In production this
// will change to a `Seal <hello@seal.app>` once the domain is verified
// and SES / Postmark / Resend is wired.
const FROM_ADDRESS = (() => {
  const user = process.env.GMAIL_USER;
  return user ? `Seal via ${user} <${user}>` : "Seal <noreply@seal.app>";
})();

function isConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// Cache the transporter — Nodemailer recommends reusing the connection
// pool. Creating a new transport on every send is wasteful and can trip
// Gmail's anti-abuse rate limits.
let cachedTransport: Transporter | null = null;
function getTransport(): Transporter | null {
  if (!isConfigured()) return null;
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });
  return cachedTransport;
}

function verifyEmailHtml({ user, url }: SendArgs): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#000000;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding:0 0 24px 0;">
                <span style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#3513A5;font-weight:500;">Seal</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 0;font-size:24px;font-weight:700;line-height:1.25;">
                Verify your email
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;font-size:16px;line-height:1.55;color:#000000;">
                Hi ${escapeHtml(user.name)}, click the button below to confirm your email and unlock your account. The link expires in 1 hour.
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;">
                <a href="${url}" style="display:inline-block;background:#000000;color:#FFFFFF;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:500;text-decoration:none;">
                  Verify email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 0;font-size:13px;color:#6b6b73;">
                Or paste this link into your browser:
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;font-size:13px;color:#3513A5;word-break:break-all;">
                ${url}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;font-size:12px;color:#6b6b73;line-height:1.5;">
                You can safely ignore this email if you didn't create a Seal account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function resetPasswordHtml({ user, url }: SendArgs): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#000000;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding:0 0 24px 0;">
                <span style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#3513A5;font-weight:500;">Seal</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 0;font-size:24px;font-weight:700;line-height:1.25;">
                Reset your password
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;font-size:16px;line-height:1.55;color:#000000;">
                Hi ${escapeHtml(user.name)}, we received a request to reset the password for your Seal account. Click below to choose a new one.
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;">
                <a href="${url}" style="display:inline-block;background:#000000;color:#FFFFFF;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:500;text-decoration:none;">
                  Reset password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 0;font-size:13px;color:#6b6b73;">
                Or paste this link into your browser:
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;font-size:13px;color:#3513A5;word-break:break-all;">
                ${url}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 0 0 0;border-top:1px solid #e5e5e5;font-size:12px;color:#6b6b73;line-height:1.5;">
                The link expires in 1 hour. You can safely ignore this email if you didn't request a password reset.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail(args: SendArgs): Promise<void> {
  if (!isConfigured()) {
    console.info(
      `[email:dev] verification email for ${args.user.email}\n  → ${args.url}`,
    );
    return;
  }
  const transport = getTransport()!;
  try {
    await transport.sendMail({
      from: FROM_ADDRESS,
      to: args.user.email,
      subject: "Verify your email — Seal",
      html: verifyEmailHtml(args),
    });
  } catch (error) {
    console.error("[email] failed to send verification email", error);
  }
}

export async function sendPasswordResetEmail(args: SendArgs): Promise<void> {
  if (!isConfigured()) {
    console.info(
      `[email:dev] password reset for ${args.user.email}\n  → ${args.url}`,
    );
    return;
  }
  const transport = getTransport()!;
  try {
    await transport.sendMail({
      from: FROM_ADDRESS,
      to: args.user.email,
      subject: "Reset your password — Seal",
      html: resetPasswordHtml(args),
    });
  } catch (error) {
    console.error("[email] failed to send password reset email", error);
  }
}

/**
 * Generic mail-send. Used by `lib/delivery.ts` for the cron-driven
 * capsule email channel. Returns a tagged result so the caller can
 * record a `notification` row with the failure reason without try/catch
 * boilerplate. In dev with no Gmail configured, the message is logged
 * to the server console and reported as "ok" (the dev wants to see the
 * payload, not get a failure).
 */
export async function sendMail(args: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true; preview?: string } | { ok: false; reason: string }> {
  if (!isConfigured()) {
    console.info(
      `[email:dev] → ${args.to}\n  subject: ${args.subject}\n  (${args.text ?? stripHtmlForLog(args.html).slice(0, 200)}…)`,
    );
    return { ok: true, preview: "logged to dev server console" };
  }
  const transport = getTransport()!;
  try {
    await transport.sendMail(args);
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[email] sendMail failed", reason);
    return { ok: false, reason };
  }
}

function stripHtmlForLog(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
