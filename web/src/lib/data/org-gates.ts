import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

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
