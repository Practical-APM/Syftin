/**
 * Provider-agnostic transactional email sender.
 *
 * Configuration (env):
 *   EMAIL_FROM       — verified sender, e.g. "Syftin <noreply@syftin.io>"
 *   EMAIL_API_URL    — HTTP email API endpoint (default: Resend)
 *   EMAIL_API_KEY    — bearer token for the email API
 *
 * When EMAIL_API_KEY is absent (local/dev), emails are logged to the server
 * console instead of sent, so OTP flows still work end-to-end without a provider.
 * This same seam works for Render-hosted SMTP relays, Resend, or any
 * Resend-compatible HTTP email API.
 */

const DEFAULT_EMAIL_API_URL = "https://api.resend.com/emails";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_API_KEY?.trim());
}

function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || "Syftin <noreply@syftin.io>";
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true; delivered: boolean } | { ok: false; error: string }> {
  const apiKey = process.env.EMAIL_API_KEY?.trim();

  if (!apiKey) {
    // Dev fallback: log so OTP / notifications remain testable without a provider.
    console.info(
      `[email:dev] to=${input.to} subject=${input.subject}\n${input.text ?? input.html}`,
    );
    return { ok: true, delivered: false };
  }

  const url = process.env.EMAIL_API_URL?.trim() || DEFAULT_EMAIL_API_URL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Email provider returned ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    return { ok: true, delivered: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email send failed.",
    };
  }
}

export function otpEmailTemplate(otp: string): { subject: string; html: string; text: string } {
  const subject = `${otp} is your Syftin verification code`;
  const text = `Your Syftin verification code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h1 style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Verify your Syftin workspace</h1>
      <p style="font-size:14px;color:#444;margin:0 0 24px;">
        Enter this code to verify your account and unlock full extraction volumes:
      </p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#B8860B;text-align:center;padding:16px;background:#faf6ec;border-radius:12px;">
        ${otp}
      </div>
      <p style="font-size:12px;color:#888;margin:24px 0 0;">
        This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.
      </p>
    </div>
  `.trim();
  return { subject, html, text };
}
