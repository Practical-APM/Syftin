import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isEmailConfigured, otpEmailTemplate, sendEmail } from "@/lib/email/mailer";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return null;
  return trimmed;
}

function hashOtp(email: string, otp: string): string {
  return createHash("sha256")
    .update(`${email}:${otp}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev"}`)
    .digest("hex");
}

/** Account-level verification gate (email OTP; replaces SMS). */
export async function getOrgVerified(orgId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("email_verified")
    .eq("id", orgId)
    .single();

  return Boolean(data?.email_verified);
}

export async function sendVerificationEmail(
  orgId: string,
  rawEmail: string,
): Promise<{ ok: true; devOtp?: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, devOtp: "123456" };
  }

  const admin = createAdminClient();

  const { data: taken } = await admin
    .from("organizations")
    .select("id")
    .eq("verification_email", email)
    .eq("email_verified", true)
    .neq("id", orgId)
    .maybeSingle();

  if (taken) {
    return {
      ok: false,
      error: "This email is already linked to another workspace.",
    };
  }

  const devBypass = process.env.EMAIL_OTP_DEV_BYPASS?.trim();
  const otp =
    devBypass && devBypass.length === 6
      ? devBypass
      : String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error } = await admin
    .from("organizations")
    .update({
      verification_email: email,
      email_otp_hash: hashOtp(email, otp),
      email_otp_expires_at: expiresAt,
      email_otp_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) return { ok: false, error: error.message };

  const template = otpEmailTemplate(otp);
  const result = await sendEmail({ to: email, ...template });
  if (!result.ok) {
    return { ok: false, error: `Could not send verification email: ${result.error}` };
  }

  // When no provider is configured, surface the OTP for local testing only.
  if (!isEmailConfigured() && (process.env.NODE_ENV !== "production" || devBypass)) {
    return { ok: true, devOtp: otp };
  }

  return { ok: true };
}

export async function verifyEmailOtp(
  orgId: string,
  rawEmail: string,
  otp: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return { ok: false, error: "Invalid email address." };
  }
  if (!/^\d{6}$/.test(otp.trim())) {
    return { ok: false, error: "Enter the 6-digit code." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  const admin = createAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .select(
      "verification_email, email_otp_hash, email_otp_expires_at, email_otp_attempts",
    )
    .eq("id", orgId)
    .single();

  if (error || !org) return { ok: false, error: "Workspace not found." };
  if (org.verification_email !== email) {
    return { ok: false, error: "Email does not match. Request a new code." };
  }
  if (!org.email_otp_hash || !org.email_otp_expires_at) {
    return { ok: false, error: "No code pending. Request a new one." };
  }
  if (Number(org.email_otp_attempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }
  if (new Date(org.email_otp_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Code expired. Request a new one." };
  }
  if (org.email_otp_hash !== hashOtp(email, otp.trim())) {
    await admin
      .from("organizations")
      .update({ email_otp_attempts: Number(org.email_otp_attempts ?? 0) + 1 })
      .eq("id", orgId);
    return { ok: false, error: "Incorrect code." };
  }

  const { error: updateError } = await admin
    .from("organizations")
    .update({
      email_verified: true,
      email_otp_hash: null,
      email_otp_expires_at: null,
      email_otp_attempts: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true };
}
