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

/** Benchmark-gated domains requiring Playwright (runtime registration). */
const benchmarkPlaywrightDomains = new Set<string>();

export function markDomainPlaywrightRequired(domain: string): void {
  benchmarkPlaywrightDomains.add(normalizeDomain(domain));
}

export function isPlaywrightRequiredDomain(domain: string): boolean {
  const d = normalizeDomain(domain);
  return JS_HEAVY_DOMAINS.has(d) || benchmarkPlaywrightDomains.has(d);
}

/** Parse persisted tier hint from whitelist legal_notes. */
export function minFetchTierFromLegalNotes(
  legalNotes: string | null | undefined,
): ComputeTier | null {
  if (!legalNotes) return null;
  if (legalNotes.includes("min_fetch_tier:ranger")) return "ranger";
  if (legalNotes.includes("min_fetch_tier:titan")) return "titan";
  return null;
}

const TIER_RANK: Record<ComputeTier, number> = {
  scout: 1,
  ranger: 2,
  titan: 3,
};

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

export function requiredTierForDomain(domain: string): ComputeTier {
  return isPlaywrightRequiredDomain(domain) ? "ranger" : "scout";
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
