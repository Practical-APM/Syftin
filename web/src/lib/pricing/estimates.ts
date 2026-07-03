import { DEFAULT_JOB_COST_CENTS, MAX_BATCH_URLS, PLATFORM_MAX_RECORDS, MAX_JOB_BUDGET_INR } from "@/lib/env";

/** Suggested starting target when the buyer does not specify volume */
export const DEFAULT_TARGET_RECORDS = 500;

/** Estimated paise per record collected (₹0.10) */
export const RECORD_UNIT_COST_PAISE = 10;

export const MIN_BUDGET_INR = 5;

export type CostEstimate = {
  baseCents: number;
  recordCents: number;
  totalCents: number;
  /** Buyer-set row target (before platform safety clamp) */
  targetRecords: number;
  /** Rows affordable within budget (null if no budget set) */
  budgetRecords: number | null;
  /** Rows we expect to collect: min(target, budget, platform safety) */
  effectiveRecords: number;
  limitedBy: "target" | "budget" | "platform" | null;
  urlCount: number;
};

export function clampTargetRecords(value: number): number {
  if (!Number.isFinite(value) || value < 1) return DEFAULT_TARGET_RECORDS;
  return Math.min(Math.round(value), PLATFORM_MAX_RECORDS);
}

export function clampBudgetInr(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return MIN_BUDGET_INR;
  return Math.min(Math.round(value), MAX_JOB_BUDGET_INR);
}

/** How many records fit in the buyer's budget after base extraction fee */
export function recordsAffordableByBudget(
  budgetInr: number,
  urlCount = 1,
): number {
  const budgetCents = clampBudgetInr(budgetInr) * 100;
  const baseCents = DEFAULT_JOB_COST_CENTS * urlCount;
  const remainingCents = Math.max(0, budgetCents - baseCents);
  const perUrlPaise = Math.floor((remainingCents * 100) / RECORD_UNIT_COST_PAISE);
  return Math.max(0, Math.floor(perUrlPaise / urlCount));
}

export function resolveRecordLimits(input: {
  maxRecords?: number;
  budgetInr?: number;
  urlCount?: number;
}): Pick<
  CostEstimate,
  "targetRecords" | "budgetRecords" | "effectiveRecords" | "limitedBy"
> {
  const urlCount = Math.max(1, input.urlCount ?? 1);
  const rawTarget =
    input.maxRecords != null && Number.isFinite(input.maxRecords)
      ? Math.round(input.maxRecords)
      : DEFAULT_TARGET_RECORDS;
  const targetRecords = clampTargetRecords(rawTarget);
  const budgetRecords =
    input.budgetInr != null && input.budgetInr > 0
      ? recordsAffordableByBudget(input.budgetInr, urlCount)
      : null;

  let effectiveRecords = targetRecords;
  if (budgetRecords != null) {
    effectiveRecords = Math.min(effectiveRecords, budgetRecords);
  }

  let limitedBy: CostEstimate["limitedBy"] = "target";
  if (budgetRecords != null && effectiveRecords === budgetRecords && budgetRecords < rawTarget) {
    limitedBy = "budget";
  } else if (rawTarget > PLATFORM_MAX_RECORDS) {
    limitedBy = "platform";
  }

  return { targetRecords, budgetRecords, effectiveRecords, limitedBy };
}

export function estimateJobCost(input: {
  maxRecords?: number;
  budgetInr?: number;
}): CostEstimate {
  const limits = resolveRecordLimits(input);
  const baseCents = DEFAULT_JOB_COST_CENTS;
  const recordCents =
    Math.round((limits.effectiveRecords * RECORD_UNIT_COST_PAISE) / 100) * 100;
  let totalCents = baseCents + recordCents;

  if (input.budgetInr != null && input.budgetInr > 0) {
    const budgetCents = clampBudgetInr(input.budgetInr) * 100;
    totalCents = Math.min(totalCents, budgetCents);
  }

  return {
    baseCents,
    recordCents,
    totalCents,
    urlCount: 1,
    ...limits,
  };
}

export function estimateBatchCost(input: {
  urlCount: number;
  maxRecords?: number;
  budgetInr?: number;
}): CostEstimate {
  const urlCount = Math.max(1, Math.min(input.urlCount, MAX_BATCH_URLS));
  const limits = resolveRecordLimits({ ...input, urlCount });
  const perUrlBase = DEFAULT_JOB_COST_CENTS;
  const baseCents = perUrlBase * urlCount;
  const recordCents =
    Math.round(
      (limits.effectiveRecords * urlCount * RECORD_UNIT_COST_PAISE) / 100,
    ) * 100;
  let totalCents = baseCents + recordCents;

  if (input.budgetInr != null && input.budgetInr > 0) {
    const budgetCents = clampBudgetInr(input.budgetInr) * 100;
    totalCents = Math.min(totalCents, budgetCents);
  }

  return {
    baseCents,
    recordCents,
    totalCents,
    urlCount,
    ...limits,
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
  },
): Record<string, unknown> {
  return {
    ...schema,
    _syftin: {
      max_records: meta.max_records,
      budget_cents: meta.budget_cents,
      effective_max_records: meta.effective_max_records,
    },
  };
}

export function validateJobVolumeInput(input: {
  max_records?: unknown;
  budget_cents?: unknown;
}): { ok: true; maxRecords: number; budgetCents?: number } | { ok: false; error: string } {
  if (input.max_records != null) {
    const n = Number(input.max_records);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: "Target records must be at least 1." };
    }
    if (n > PLATFORM_MAX_RECORDS) {
      return {
        ok: false,
        error: `Target records cannot exceed ${PLATFORM_MAX_RECORDS.toLocaleString()} (platform safety limit). Contact support for larger pulls.`,
      };
    }
  }

  if (input.budget_cents != null) {
    const cents = Number(input.budget_cents);
    if (!Number.isFinite(cents) || cents < MIN_BUDGET_INR * 100) {
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

/** @deprecated use PLATFORM_MAX_RECORDS from env */
export const MAX_RECORDS_CEILING = PLATFORM_MAX_RECORDS;

/** @deprecated use clampTargetRecords */
export const clampMaxRecords = clampTargetRecords;
