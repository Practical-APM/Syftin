import { getWhitelistEntryForDomain } from "@/lib/data/domains";
import {
  defaultPricingForDomain,
  pricingFromWhitelistEntry,
  type DomainPricing,
} from "@/lib/pricing/domain-pricing";
import {
  attachJobMeta,
  DEFAULT_TARGET_RECORDS,
  MIN_BUDGET_PAISE,
} from "@/lib/pricing/estimates";
import {
  buildJobEconomics,
  type JobEconomics,
  workerPayoutCeilingPaise,
} from "@/lib/pricing/job-economics";
import {
  perRecordMultiplierForExtractionTier,
  type ExtractionTier,
} from "@/lib/data/org-sla";

export type ServerJobMetaResult = {
  schema: Record<string, unknown>;
  chargePaise: number;
  economics: JobEconomics;
  effectiveRecords: number;
  budgetCents: number;
};

/** Remove client-supplied economics; server is the authority. */
export function stripSyftinMeta(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const { _syftin: _removed, ...rest } = schema;
  return rest;
}

export async function resolveDomainPricing(
  domain: string,
): Promise<DomainPricing> {
  const entry = await getWhitelistEntryForDomain(domain);
  return entry
    ? pricingFromWhitelistEntry(entry)
    : defaultPricingForDomain(domain);
}

export function minBudgetPaiseForUrls(pricingList: DomainPricing[]): number {
  return pricingList.reduce((sum, p) => sum + p.baseFeePaise, 0);
}

export function validateBudgetFloor(
  budgetPaise: number,
  pricingList: DomainPricing[],
): string | null {
  const floor = minBudgetPaiseForUrls(pricingList);
  if (budgetPaise < floor) {
    return `Budget must be at least ₹${(floor / 100).toLocaleString("en-IN")} for ${pricingList.length} URL(s) (base fee).`;
  }
  return null;
}

export async function buildServerJobSchema(input: {
  schema: Record<string, unknown>;
  domain: string;
  targetUrl?: string;
  maxRecords?: number;
  budgetCents?: number;
  extractionTier?: ExtractionTier;
}): Promise<ServerJobMetaResult | { ok: false; error: string }> {
  const pricing = await resolveDomainPricing(input.domain);
  const budgetPaise =
    input.budgetCents != null && input.budgetCents > 0
      ? Math.round(input.budgetCents)
      : undefined;

  if (budgetPaise != null && budgetPaise < MIN_BUDGET_PAISE) {
    return { ok: false, error: "Budget must be at least ₹5." };
  }

  const floorError = budgetPaise
    ? validateBudgetFloor(budgetPaise, [pricing])
    : null;
  if (floorError) return { ok: false, error: floorError };

  const economics = buildJobEconomics({
    pricing,
    maxRecords: input.maxRecords,
    budgetPaise,
    urlCount: 1,
    defaultTarget: DEFAULT_TARGET_RECORDS,
    extractionTierMultiplier: perRecordMultiplierForExtractionTier(
      input.extractionTier ?? "standard",
    ),
  });

  const budgetCents =
    budgetPaise ?? economics.grossRevenuePaise;
  const clean = stripSyftinMeta(input.schema);

  const schema = attachJobMeta(clean, {
    max_records:
      input.maxRecords != null
        ? Math.round(input.maxRecords)
        : economics.targetRecords,
    budget_cents: budgetCents,
    effective_max_records: economics.effectiveRecords,
    limited_by: economics.limitedBy,
    target_url: input.targetUrl,
    economics,
    domain: input.domain,
  });

  return {
    schema,
    chargePaise: economics.grossRevenuePaise,
    economics,
    effectiveRecords: economics.effectiveRecords,
    budgetCents,
  };
}

export async function buildServerBatchSchema(input: {
  schema: Record<string, unknown>;
  domains: string[];
  maxRecords?: number;
  budgetCents?: number;
}): Promise<ServerJobMetaResult | { ok: false; error: string }> {
  const urlCount = Math.max(1, input.domains.length);
  const pricingList = await Promise.all(
    input.domains.map((d) => resolveDomainPricing(d)),
  );

  const budgetPaise =
    input.budgetCents != null && input.budgetCents > 0
      ? Math.round(input.budgetCents)
      : undefined;

  if (budgetPaise != null && budgetPaise < MIN_BUDGET_PAISE) {
    return { ok: false, error: "Budget must be at least ₹5." };
  }

  const floorError = budgetPaise
    ? validateBudgetFloor(budgetPaise, pricingList)
    : null;
  if (floorError) return { ok: false, error: floorError };

  // Per-shard economics share the batch target/budget; gross is summed then capped.
  const representativePricing = pricingList[0] ?? defaultPricingForDomain("standard");
  const sharedLimits = buildJobEconomics({
    pricing: representativePricing,
    maxRecords: input.maxRecords,
    budgetPaise,
    urlCount,
    defaultTarget: DEFAULT_TARGET_RECORDS,
  });

  let totalGross = 0;
  for (const pricing of pricingList) {
    const shard = buildJobEconomics({
      pricing,
      maxRecords: sharedLimits.targetRecords,
      budgetPaise: undefined,
      urlCount: 1,
    });
    totalGross += shard.grossRevenuePaise;
  }

  if (budgetPaise != null) {
    totalGross = Math.min(totalGross, budgetPaise);
  }

  const economics: JobEconomics = {
    ...sharedLimits,
    pricing: representativePricing,
    grossRevenuePaise: totalGross,
    workerPayoutCeilingPaise: workerPayoutCeilingPaise(
      totalGross,
      sharedLimits.effectiveRecords,
    ),
  };

  const budgetCents = budgetPaise ?? totalGross;
  const clean = stripSyftinMeta(input.schema);

  const schema = attachJobMeta(clean, {
    max_records:
      input.maxRecords != null
        ? Math.round(input.maxRecords)
        : sharedLimits.targetRecords,
    budget_cents: budgetCents,
    effective_max_records: sharedLimits.effectiveRecords,
    limited_by: sharedLimits.limitedBy,
    economics,
    domain: input.domains[0],
  });

  return {
    schema,
    chargePaise: totalGross,
    economics,
    effectiveRecords: sharedLimits.effectiveRecords,
    budgetCents,
  };
}
