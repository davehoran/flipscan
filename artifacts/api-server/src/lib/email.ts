import { Resend } from "resend";
import { logger } from "./logger";

const FROM = "hello@scanflip.online";
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function send(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean }> {
  if (!resend) {
    logger.info({ to: opts.to, subject: opts.subject }, "[email stub] would send email");
    return { ok: true };
  }
  const { error } = await resend.emails.send({ from: FROM, ...opts });
  if (error) {
    logger.error({ error, to: opts.to }, "Resend send failed");
    return { ok: false };
  }
  return { ok: true };
}

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
): Promise<{ ok: boolean }> {
  return send({
    to,
    subject: "Welcome to Scan Flip — your 7-day free trial has started!",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>Welcome, ${firstName}!</h2>
        <p>Your <strong>7-day Pro trial</strong> is now active — scan as many items as you like and save your best finds.</p>
        <p>After the trial, Pro is just <strong>$7.99/month</strong> — cancel anytime.</p>
        <p style="margin-top:24px;"><a href="https://scanflip.online/scan" style="background:#007AFF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Start Scanning</a></p>
        <p style="color:#888;font-size:12px;margin-top:32px;">Scan Flip · scanflip.online</p>
      </div>
    `,
  });
}

export async function sendReferralEmail(
  to: string,
  senderName: string,
  personalMessage: string | undefined,
  promoCode: string,
  signUpUrl: string,
): Promise<{ ok: boolean }> {
  const messageBlock = personalMessage
    ? `<blockquote style="border-left:3px solid #007AFF;padding-left:12px;color:#555;">${personalMessage}</blockquote>`
    : "";
  return send({
    to,
    subject: `${senderName} invited you to Scan Flip — get your first month free`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>${senderName} thinks you'd love Scan Flip</h2>
        ${messageBlock}
        <p>Scan Flip uses AI + live eBay data to tell you exactly what an item is worth — in seconds.</p>
        <p>Your friend is sending you <strong>one free month of Pro</strong>. Use this code at checkout:</p>
        <div style="background:#F2F2F7;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
          <span style="font-size:24px;font-weight:700;letter-spacing:2px;">${promoCode}</span>
        </div>
        <p style="margin-top:16px;"><a href="${signUpUrl}" style="background:#007AFF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Claim Your Free Month</a></p>
        <p style="color:#888;font-size:12px;margin-top:32px;">Scan Flip · scanflip.online</p>
      </div>
    `,
  });
}
