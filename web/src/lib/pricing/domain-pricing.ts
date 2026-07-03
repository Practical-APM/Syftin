import type { WhitelistEntry } from "@/lib/data/domains";

/** Standard tier defaults (revenue_pipeline.md §2) */
export const STANDARD_BASE_FEE_PAISE = 500;
export const STANDARD_PER_RECORD_PAISE = 10;

/** Adversarial / high-value tier defaults */
export const ADVERSARIAL_BASE_FEE_PAISE = 1500;
export const ADVERSARIAL_PER_RECORD_PAISE = 25;

/** Domains that require consensus double-fetch when DB row is absent */
export const DEFAULT_ADVERSARIAL_DOMAINS = new Set([
  "amazon.in",
  "amazon.com",
  "linkedin.com",
  "google.com",
  "mca.gov.in",
]);

export type PriceTier = "standard" | "adversarial";

export type DomainPricing = {
  domain: string;
  baseFeePaise: number;
  perRecordPaise: number;
  priceTier: PriceTier;
  requiresConsensus: boolean;
};

export function defaultPricingForDomain(domain: string): DomainPricing {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  const adversarial = DEFAULT_ADVERSARIAL_DOMAINS.has(normalized);
  return {
    domain: normalized,
    baseFeePaise: adversarial ? ADVERSARIAL_BASE_FEE_PAISE : STANDARD_BASE_FEE_PAISE,
    perRecordPaise: adversarial
      ? ADVERSARIAL_PER_RECORD_PAISE
      : STANDARD_PER_RECORD_PAISE,
    priceTier: adversarial ? "adversarial" : "standard",
    requiresConsensus: adversarial,
  };
}

export function pricingFromWhitelistEntry(entry: WhitelistEntry): DomainPricing {
  const normalized = entry.domain.trim().toLowerCase().replace(/^www\./, "");
  const defaults = defaultPricingForDomain(normalized);
  return {
    domain: normalized,
    baseFeePaise: entry.base_fee_paise ?? defaults.baseFeePaise,
    perRecordPaise: entry.per_record_paise ?? defaults.perRecordPaise,
    priceTier: (entry.price_tier as PriceTier) ?? defaults.priceTier,
    requiresConsensus: entry.requires_consensus ?? defaults.requiresConsensus,
  };
}
