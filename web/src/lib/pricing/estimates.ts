import { DEFAULT_JOB_COST_CENTS, MAX_BATCH_URLS, PLATFORM_MAX_RECORDS, MAX_JOB_BUDGET_INR, isPhase2Enabled } from "@/lib/env";
import {
  type DomainPricing,
  defaultPricingForDomain,
  STANDARD_PER_RECORD_PAISE,
} from "@/lib/pricing/domain-pricing";
import {
  buildJobEconomics,
  economicsToSyftinMeta,
  resolveRecordLimits,
  type JobEconomics,
} from "@/lib/pricing/job-economics";

/** Suggested starting target when the buyer does not specify volume */
export const DEFAULT_TARGET_RECORDS = 500;

/** @deprecated use domain pricing per_record_paise */
export const RECORD_UNIT_COST_PAISE = STANDARD_PER_RECORD_PAISE;

export const MIN_BUDGET_INR = 5;
export const MIN_BUDGET_PAISE = MIN_BUDGET_INR * 100;

/** Free-tier (unverified) max rows per job (§3) */
export const FREE_TIER_MAX_RECORDS = 500;

export type CostEstimate = {
  baseCents: number;
  recordCents: number;
  totalCents: number;
  targetRecords: number;
  budgetRecords: number | null;
  effectiveRecords: number;
  limitedBy: "target" | "budget" | "platform" | null;
  urlCount: number;
  pricing: DomainPricing;
  economics: JobEconomics;
};

export function clampTargetRecords(value: number): number {
  if (!Number.isFinite(value) || value < 1) return DEFAULT_TARGET_RECORDS;
  return Math.min(Math.round(value), PLATFORM_MAX_RECORDS);
}

export function clampBudgetInr(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return MIN_BUDGET_INR;
  return Math.min(Math.round(value), MAX_JOB_BUDGET_INR);
}

export function estimateJobCost(input: {
  maxRecords?: number;
  budgetInr?: number;
  domain?: string;
  pricing?: DomainPricing;
}): CostEstimate {
  const pricing =
    input.pricing ??
    (input.domain ? defaultPricingForDomain(input.domain) : defaultPricingForDomain("standard"));
  const budgetPaise =
    input.budgetInr != null && input.budgetInr > 0
      ? clampBudgetInr(input.budgetInr) * 100
      : undefined;

  const economics = buildJobEconomics({
    pricing,
    maxRecords: input.maxRecords,
    budgetPaise,
    urlCount: 1,
    defaultTarget: DEFAULT_TARGET_RECORDS,
  });

  const recordCents =
    Math.round(
      (economics.effectiveRecords * pricing.perRecordPaise) / 100,
    ) * 100;

  return {
    baseCents: pricing.baseFeePaise,
    recordCents,
    totalCents: economics.grossRevenuePaise,
    urlCount: 1,
    pricing,
    economics,
    targetRecords: economics.targetRecords,
    budgetRecords: economics.budgetRecords,
    effectiveRecords: economics.effectiveRecords,
    limitedBy: economics.limitedBy,
  };
}

export function estimateBatchCost(input: {
  urlCount: number;
  domains?: string[];
  maxRecords?: number;
  budgetInr?: number;
}): CostEstimate {
  const urlCount = Math.max(1, Math.min(input.urlCount, MAX_BATCH_URLS));
  const budgetPaise =
    input.budgetInr != null && input.budgetInr > 0
      ? clampBudgetInr(input.budgetInr) * 100
      : undefined;

  // Sum per-shard economics when domains are known; else use standard pricing × N
  if (input.domains?.length) {
    let totalGross = 0;
    let totalBase = 0;
    let totalRecord = 0;
    const shardDomains = input.domains.slice(0, urlCount);
    const perShardLimits = resolveRecordLimits({
      maxRecords: input.maxRecords,
      budgetPaise,
      urlCount: shardDomains.length,
      pricing: defaultPricingForDomain(shardDomains[0] ?? "standard"),
      defaultTarget: DEFAULT_TARGET_RECORDS,
    });

    for (const domain of shardDomains) {
      const pricing = defaultPricingForDomain(domain);
      const shard = buildJobEconomics({
        pricing,
        maxRecords: perShardLimits.targetRecords,
        budgetPaise: undefined,
        urlCount: 1,
      });
      totalGross += shard.grossRevenuePaise;
      totalBase += pricing.baseFeePaise;
      totalRecord +=
        Math.round((shard.effectiveRecords * pricing.perRecordPaise) / 100) *
        100;
    }

    if (budgetPaise != null) {
      totalGross = Math.min(totalGross, budgetPaise);
    }

    const representative = buildJobEconomics({
      pricing: defaultPricingForDomain(shardDomains[0] ?? "standard"),
      maxRecords: input.maxRecords,
      budgetPaise,
      urlCount: shardDomains.length,
    });

    return {
      baseCents: totalBase,
      recordCents: totalRecord,
      totalCents: totalGross,
      urlCount: shardDomains.length,
      pricing: representative.pricing,
      economics: { ...representative, grossRevenuePaise: totalGross },
      targetRecords: representative.targetRecords,
      budgetRecords: representative.budgetRecords,
      effectiveRecords: representative.effectiveRecords,
      limitedBy: representative.limitedBy,
    };
  }

  const pricing = defaultPricingForDomain("standard");
  const economics = buildJobEconomics({
    pricing,
    maxRecords: input.maxRecords,
    budgetPaise,
    urlCount,
    defaultTarget: DEFAULT_TARGET_RECORDS,
  });

  const recordCents =
    Math.round(
      (economics.effectiveRecords * urlCount * pricing.perRecordPaise) / 100,
    ) * 100;

  return {
    baseCents: pricing.baseFeePaise * urlCount,
    recordCents,
    totalCents: economics.grossRevenuePaise,
    urlCount,
    pricing,
    economics,
    targetRecords: economics.targetRecords,
    budgetRecords: economics.budgetRecords,
    effectiveRecords: economics.effectiveRecords,
    limitedBy: economics.limitedBy,
  };
}

export function formatInrFromCents(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function attachJobMeta(
  schema: Record<string, unknown>,
  meta: {
    max_records: number;
    budget_cents: number;
    effective_max_records: number;
    limited_by?: JobEconomics["limitedBy"];
    target_url?: string;
    economics?: JobEconomics;
    domain?: string;
  },
): Record<string, unknown> {
  const pricing =
    meta.economics?.pricing ??
    (meta.domain ? defaultPricingForDomain(meta.domain) : defaultPricingForDomain("standard"));

  const economics =
    meta.economics ??
    buildJobEconomics({
      pricing,
      maxRecords: meta.max_records,
      budgetPaise: meta.budget_cents,
      urlCount: 1,
    });

  const pagination = meta.target_url
    ? inferPagination(meta.target_url, meta.effective_max_records)
    : undefined;

  return {
    ...schema,
    _syftin: economicsToSyftinMeta(economics, {
      max_records: meta.max_records,
      budget_cents: meta.budget_cents,
      effective_max_records: meta.effective_max_records,
      limited_by: meta.limited_by ?? economics.limitedBy,
      pagination,
      distributed_pagination:
        Boolean(pagination) && isPhase2Enabled(),
    }),
  };
}

const PAGE_PARAMS = ["page", "p", "pg", "pn", "pagenum", "pageno"] as const;

export function inferPagination(
  targetUrl: string,
  effectiveRecords: number,
): {
  mode: "auto" | "query" | "next_link" | "load_more" | "scroll";
  param?: string;
  start?: number;
  max_pages: number;
} | undefined {
  if (effectiveRecords <= 100) return undefined;

  const maxPages = Math.min(
    200,
    Math.max(10, Math.ceil(effectiveRecords / 20)),
  );

  let param: string | undefined;
  let start = 1;

  try {
    const url = new URL(targetUrl);
    for (const candidate of PAGE_PARAMS) {
      const raw = url.searchParams.get(candidate);
      if (raw != null && raw !== "") {
        param = candidate;
        const n = Number.parseInt(raw, 10);
        start = Number.isFinite(n) && n > 0 ? n : 1;
        break;
      }
    }
  } catch {
    return effectiveRecords > 500
      ? { mode: "auto", max_pages: maxPages }
      : undefined;
  }

  if (!param && effectiveRecords <= 500) return undefined;

  return {
    mode: "auto",
    param: param ?? "page",
    start,
    max_pages: maxPages,
  };
}

export function schemaNeedsHubPagination(
  schema: Record<string, unknown>,
  targetUrl: string,
): boolean {
  const raw = schema._syftin;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const syftin = raw as Record<string, unknown>;
    if (syftin.pagination != null) return true;
    const effective =
      Number(syftin.effective_max_records) || Number(syftin.max_records) || 0;
    if (effective > 0) {
      return inferPagination(targetUrl, effective) != null;
    }
  }
  return inferPagination(targetUrl, DEFAULT_TARGET_RECORDS) != null;
}

export function validateJobVolumeInput(input: {
  max_records?: unknown;
  budget_cents?: unknown;
  isVerifiedAccount?: boolean;
}): { ok: true; maxRecords: number; budgetCents?: number } | { ok: false; error: string } {
  if (input.max_records != null) {
    const n = Number(input.max_records);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: "Target records must be at least 1." };
    }
    const cap = input.isVerifiedAccount === false
      ? FREE_TIER_MAX_RECORDS
      : PLATFORM_MAX_RECORDS;
    if (n > cap) {
      return {
        ok: false,
        error:
          input.isVerifiedAccount === false
            ? `Unverified accounts are limited to ${FREE_TIER_MAX_RECORDS} rows per job. Verify your phone to unlock higher volumes.`
            : `Target records cannot exceed ${PLATFORM_MAX_RECORDS.toLocaleString()} (platform safety limit). Contact support for larger pulls.`,
      };
    }
  }

  if (input.budget_cents != null) {
    const cents = Number(input.budget_cents);
    if (!Number.isFinite(cents) || cents < MIN_BUDGET_PAISE) {
      return { ok: false, error: `Budget must be at least ₹${MIN_BUDGET_INR}.` };
    }
    if (cents > MAX_JOB_BUDGET_INR * 100) {
      return {
        ok: false,
        error: `Budget cannot exceed ₹${MAX_JOB_BUDGET_INR.toLocaleString()}. Contact support for enterprise volume.`,
      };
    }
  }

  const maxRecords = clampTargetRecords(
    input.max_records != null ? Number(input.max_records) : DEFAULT_TARGET_RECORDS,
  );

  return {
    ok: true,
    maxRecords,
    budgetCents:
      input.budget_cents != null ? Math.round(Number(input.budget_cents)) : undefined,
  };
}

/** @deprecated use clampTargetRecords */
export const DEFAULT_MAX_RECORDS = DEFAULT_TARGET_RECORDS;
export const MAX_RECORDS_CEILING = PLATFORM_MAX_RECORDS;
export const clampMaxRecords = clampTargetRecords;

/** @deprecated use domain pricing */
export function recordsAffordableByBudget(
  budgetInr: number,
  urlCount = 1,
): number {
  const budgetPaise = clampBudgetInr(budgetInr) * 100;
  const basePaise = DEFAULT_JOB_COST_CENTS * urlCount;
  const remainingPaise = Math.max(0, budgetPaise - basePaise);
  const perUrlRows = Math.floor(remainingPaise / STANDARD_PER_RECORD_PAISE);
  return Math.max(0, Math.floor(perUrlRows / urlCount));
}

/** @deprecated use resolveRecordLimits from job-economics */
export { resolveRecordLimits } from "@/lib/pricing/job-economics";
