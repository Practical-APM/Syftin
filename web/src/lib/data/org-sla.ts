import { createAdminClient } from "@/lib/supabase/admin";

export type SlaTier = "pilot" | "business" | "enterprise";
export type ExtractionTier = "standard" | "business" | "premium";

export async function getOrgSlaTier(orgId: string): Promise<SlaTier> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("sla_tier")
    .eq("id", orgId)
    .maybeSingle();

  const tier = data?.sla_tier as SlaTier | undefined;
  if (tier === "business" || tier === "enterprise") return tier;
  return "pilot";
}

export async function getOrgExtractionTier(
  orgId: string,
): Promise<ExtractionTier> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("extraction_tier, hub_only_extraction")
    .eq("id", orgId)
    .maybeSingle();

  const tier = data?.extraction_tier as ExtractionTier | undefined;
  if (tier === "business" || tier === "premium") return tier;
  return "standard";
}

export function jobPriorityForSlaTier(tier: SlaTier): number {
  switch (tier) {
    case "enterprise":
      return 100;
    case "business":
      return 50;
    default:
      return 0;
  }
}

export function perRecordMultiplierForExtractionTier(
  tier: ExtractionTier,
): number {
  switch (tier) {
    case "premium":
      return 2;
    case "business":
      return 1.5;
    default:
      return 1;
  }
}
