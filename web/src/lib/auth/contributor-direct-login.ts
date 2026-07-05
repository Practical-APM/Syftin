import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAuthRequired } from "@/lib/env";

/** Pilot allowlist — always permitted for passwordless direct sign-in. */
const DEFAULT_DIRECT_CONTRIBUTOR_EMAILS = ["a@a.in"];

export function getDirectContributorLoginEmails(): string[] {
  const fromEnv =
    process.env.CONTRIBUTOR_DIRECT_LOGIN_EMAILS?.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return [...new Set([...DEFAULT_DIRECT_CONTRIBUTOR_EMAILS, ...fromEnv])];
}

function isOnContributorInviteList(email: string): boolean {
  const list = process.env.CONTRIBUTOR_INVITE_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list?.includes(email)) return true;
  if (process.env.CONTRIBUTOR_OPEN === "true") return true;
  if (!isAuthRequired()) return true;
  return false;
}

export function isDirectContributorLoginEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (getDirectContributorLoginEmails().includes(normalized)) return true;
  return isOnContributorInviteList(normalized);
}

export function directContributorLoginConfigured(): boolean {
  return getDirectContributorLoginEmails().length > 0;
}

/**
 * Establish a Supabase session without sending email — admin generateLink +
 * server-side verifyOtp (pilot bypass when magic links are unreliable).
 */
export async function establishContributorSession(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!isDirectContributorLoginEmail(normalized)) {
    throw new Error("This email is not enabled for direct contributor sign-in.");
  }

  const requiredPassword = process.env.CONTRIBUTOR_DIRECT_LOGIN_PASSWORD?.trim();
  const admin = createAdminClient();
  const supabase = await createClient();

  if (requiredPassword) {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password: requiredPassword,
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) return user;
    }

    const { error: createError } = await admin.auth.admin.createUser({
      email: normalized,
      password: requiredPassword,
      email_confirm: true,
    });
    if (createError && !createError.message.toLowerCase().includes("already")) {
      throw new Error(createError.message);
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalized,
      password: requiredPassword,
    });
    if (signInError) throw new Error(signInError.message);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign-in succeeded but no session was created.");
    return user;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
      options: { redirectTo: `${siteUrl}/contributor` },
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "Could not create sign-in session.");
  }

  const tokenHash = linkData.properties.hashed_token;
  for (const type of ["email", "magiclink"] as const) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data.user) return data.user;
  }

  throw new Error("Could not verify contributor sign-in.");
}
