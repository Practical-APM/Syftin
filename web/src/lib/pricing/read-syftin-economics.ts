import type { JobRewardContext } from "@/lib/contributor/economics";
import {
  defaultPricingForDomain,
  pricingFromWhitelistEntry,
  type DomainPricing,
} from "@/lib/pricing/domain-pricing";
import { buildJobEconomics } from "@/lib/pricing/job-economics";
import type { WhitelistEntry } from "@/lib/data/domains";

export type SyftinEconomicsContext = JobRewardContext & {
  pricing: DomainPricing;
  requiresConsensus: boolean;
};

/**
 * Resolve contributor reward inputs from job schema volume hints only.
 * Monetary fields are always recomputed from authoritative domain pricing —
 * never trust client-supplied _syftin pricing or payout ceilings.
 */
export function readSyftinEconomics(
  schema: Record<string, unknown> | null | undefined,
  domain: string,
  whitelistEntry?: WhitelistEntry | null,
): SyftinEconomicsContext {
  const authoritativePricing = whitelistEntry
    ? pricingFromWhitelistEntry(whitelistEntry)
    : defaultPricingForDomain(domain);

  const raw = schema?._syftin;
  const syftin =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;

  const effectiveRecords =
    Number(syftin?.effective_max_records) ||
    Number(syftin?.max_records) ||
    500;
  const budgetPaise =
    syftin?.budget_cents != null && Number(syftin.budget_cents) > 0
      ? Math.round(Number(syftin.budget_cents))
      : undefined;

  const economics = buildJobEconomics({
    pricing: authoritativePricing,
    maxRecords: effectiveRecords,
    budgetPaise,
    urlCount: 1,
  });

  return {
    domain,
    pricing: authoritativePricing,
    requiresConsensus: authoritativePricing.requiresConsensus,
    domainBaseFeePaise: authoritativePricing.baseFeePaise,
    effectiveRecords: economics.effectiveRecords,
    grossRevenuePaise: economics.grossRevenuePaise,
    workerPayoutCeilingPaise: economics.workerPayoutCeilingPaise,
    expectedFetchTasks: economics.expectedFetchTasks,
  };
}
