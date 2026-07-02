import type { ComputeTier } from "@/lib/contributor/tier";

export type { ComputeTier } from "@/lib/contributor/tier";

/** Domains that typically need Playwright / Ranger-tier edge nodes. */
export const JS_HEAVY_DOMAINS = new Set([
  "naukri.com",
  "blinkit.com",
  "zeptonow.com",
  "swiggy.com",
  "zomato.com",
  "flipkart.com",
  "amazon.in",
  "myntra.com",
]);

const TIER_RANK: Record<ComputeTier, number> = {
  scout: 1,
  ranger: 2,
  titan: 3,
};

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

export function requiredTierForDomain(domain: string): ComputeTier {
  return JS_HEAVY_DOMAINS.has(normalizeDomain(domain)) ? "ranger" : "scout";
}

export function tierRank(tier: string): number {
  if (tier === "ranger" || tier === "titan" || tier === "scout") {
    return TIER_RANK[tier];
  }
  return TIER_RANK.scout;
}

export function nodeEffectiveTier(
  computeTier: string | null | undefined,
  detectedTier: string | null | undefined,
): ComputeTier {
  const raw = detectedTier ?? computeTier ?? "scout";
  if (raw === "ranger" || raw === "titan") return raw;
  return "scout";
}

export function nodeMeetsFetchRequirement(
  nodeTier: ComputeTier,
  requiredTier: ComputeTier,
  playwrightReady: boolean,
): boolean {
  if (tierRank(nodeTier) < tierRank(requiredTier)) {
    return false;
  }
  if (requiredTier === "ranger" || requiredTier === "titan") {
    return playwrightReady;
  }
  return true;
}
