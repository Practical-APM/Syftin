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
    .select("extraction_tier")
    .eq("id", orgId)
    .maybeSingle();

  const tier = data?.extraction_tier as ExtractionTier | undefined;
  if (tier === "business" || tier === "premium") return tier;
  return "standard";
}

export async function getOrgHubOnlyExtraction(orgId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("hub_only_extraction")
    .eq("id", orgId)
    .maybeSingle();

  return Boolean(data?.hub_only_extraction);
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

export type OrgPilotSettings = {
  sla_tier: SlaTier;
  extraction_tier: ExtractionTier;
  hub_only_extraction: boolean;
};

export async function getOrgPilotSettings(
  orgId: string,
): Promise<OrgPilotSettings> {
  const [sla, extraction, hubOnly] = await Promise.all([
    getOrgSlaTier(orgId),
    getOrgExtractionTier(orgId),
    getOrgHubOnlyExtraction(orgId),
  ]);
  return {
    sla_tier: sla,
    extraction_tier: extraction,
    hub_only_extraction: hubOnly,
  };
}

export async function updateOrgPilotSettings(
  orgId: string,
  patch: Partial<OrgPilotSettings>,
): Promise<OrgPilotSettings> {
  const admin = createAdminClient();
  const payload: Record<string, unknown> = {};

  if (patch.sla_tier !== undefined) {
    if (!["pilot", "business", "enterprise"].includes(patch.sla_tier)) {
      throw new Error("Invalid sla_tier");
    }
    payload.sla_tier = patch.sla_tier;
  }
  if (patch.extraction_tier !== undefined) {
    if (!["standard", "business", "premium"].includes(patch.extraction_tier)) {
      throw new Error("Invalid extraction_tier");
    }
    payload.extraction_tier = patch.extraction_tier;
  }
  if (patch.hub_only_extraction !== undefined) {
    payload.hub_only_extraction = patch.hub_only_extraction;
  }

  if (Object.keys(payload).length === 0) {
    return getOrgPilotSettings(orgId);
  }

  const { error } = await admin
    .from("organizations")
    .update(payload)
    .eq("id", orgId);

  if (error) throw new Error(error.message);
  return getOrgPilotSettings(orgId);
}
