import type { JobRewardContext } from "@/lib/contributor/economics";
import {
  defaultPricingForDomain,
  pricingFromWhitelistEntry,
  type DomainPricing,
} from "@/lib/pricing/domain-pricing";
import {
  buildJobEconomics,
  expectedFetchTasks,
} from "@/lib/pricing/job-economics";
import type { WhitelistEntry } from "@/lib/data/domains";

export type SyftinEconomicsContext = JobRewardContext & {
  pricing: DomainPricing;
  requiresConsensus: boolean;
};

export function readSyftinEconomics(
  schema: Record<string, unknown> | null | undefined,
  domain: string,
  whitelistEntry?: WhitelistEntry | null,
): SyftinEconomicsContext {
  const pricing = whitelistEntry
    ? pricingFromWhitelistEntry(whitelistEntry)
    : defaultPricingForDomain(domain);

  const raw = schema?._syftin;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const economics = buildJobEconomics({ pricing, urlCount: 1 });
    return {
      domain,
      pricing,
      requiresConsensus: pricing.requiresConsensus,
      domainBaseFeePaise: pricing.baseFeePaise,
      effectiveRecords: economics.effectiveRecords,
      grossRevenuePaise: economics.grossRevenuePaise,
      workerPayoutCeilingPaise: economics.workerPayoutCeilingPaise,
      expectedFetchTasks: economics.expectedFetchTasks,
    };
  }

  const syftin = raw as Record<string, unknown>;
  const pricingBlock = syftin.pricing as Record<string, unknown> | undefined;
  const resolved: DomainPricing = pricingBlock
    ? {
        domain,
        baseFeePaise: Number(pricingBlock.base_fee_paise) || pricing.baseFeePaise,
        perRecordPaise:
          Number(pricingBlock.per_record_paise) || pricing.perRecordPaise,
        priceTier:
          (pricingBlock.price_tier as DomainPricing["priceTier"]) ??
          pricing.priceTier,
        requiresConsensus:
          Boolean(pricingBlock.requires_consensus) || pricing.requiresConsensus,
      }
    : pricing;

  const effectiveRecords =
    Number(syftin.effective_max_records) ||
    Number(syftin.max_records) ||
    500;
  const grossRevenuePaise =
    Number(syftin.gross_revenue_paise) ||
    buildJobEconomics({
      pricing: resolved,
      maxRecords: effectiveRecords,
      budgetPaise: Number(syftin.budget_cents) || undefined,
    }).grossRevenuePaise;
  const workerPayoutCeilingPaise =
    Number(syftin.worker_payout_ceiling_paise) ||
    buildJobEconomics({
      pricing: resolved,
      maxRecords: effectiveRecords,
      budgetPaise: Number(syftin.budget_cents) || undefined,
    }).workerPayoutCeilingPaise;
  const expectedTasks =
    Number(syftin.expected_fetch_tasks) ||
    expectedFetchTasks(effectiveRecords, resolved.requiresConsensus);

  return {
    domain,
    pricing: resolved,
    requiresConsensus: resolved.requiresConsensus,
    domainBaseFeePaise: resolved.baseFeePaise,
    effectiveRecords,
    grossRevenuePaise,
    workerPayoutCeilingPaise,
    expectedFetchTasks: expectedTasks,
  };
}
