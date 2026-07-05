import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthRequired, isSupabaseConfigured } from "@/lib/env";
import { isCreditsEnforced } from "@/lib/data/credits";
import { getOrgVerified } from "@/lib/data/email-verification";

export type OrgBillingGates = {
  dpaSignedAt: string | null;
  emailVerified: boolean;
};

export async function getOrgBillingGates(
  orgId: string,
): Promise<OrgBillingGates> {
  if (!isSupabaseConfigured()) {
    return { dpaSignedAt: new Date().toISOString(), emailVerified: true };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("dpa_signed_at, email_verified")
    .eq("id", orgId)
    .single();

  return {
    dpaSignedAt: (data?.dpa_signed_at as string | null) ?? null,
    emailVerified: Boolean(data?.email_verified),
  };
}

/** Pilot: block job creation until workspace email is OTP-verified. */
export async function assertOrgEmailVerifiedForJobs(
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAuthRequired() || !isCreditsEnforced() || !isSupabaseConfigured()) {
    return { ok: true };
  }

  const verified = await getOrgVerified(orgId);
  if (!verified) {
    return {
      ok: false,
      error:
        "Verify your workspace email before creating jobs. Open Credits → Email verification.",
    };
  }

  return { ok: true };
}
