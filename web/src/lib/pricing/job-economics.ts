import type { ComputeTier } from "@/lib/contributor/tier";
import type { TaskType } from "@/lib/types/jobs";
import { PLATFORM_MAX_RECORDS } from "@/lib/env";
import {
  type DomainPricing,
  STANDARD_PER_RECORD_PAISE,
  STANDARD_BASE_FEE_PAISE,
} from "@/lib/pricing/domain-pricing";

/** Introductory share; drops to 55% after veteran threshold (§5) */
export const INTRO_CONTRIBUTOR_SHARE_BPS = 7000;
export const VETERAN_CONTRIBUTOR_SHARE_BPS = 5500;
export const VETERAN_TASK_THRESHOLD = 10_000;

const TIER_MULTIPLIER: Record<ComputeTier, number> = {
  scout: 1,
  ranger: 1.25,
  titan: 1.5,
};

const TASK_TYPE_MULTIPLIER: Record<TaskType, number> = {
  fetch: 1.0,
  parse: 1.5,
  validate: 0.5,
  enrich: 1.25,
};

export const EDGE_INFERENCE_BONUS_MULTIPLIER = 1.25;

/** Progressive platform margin floors (§4) */
export function progressiveMarginBps(effectiveRecords: number): number {
  if (effectiveRecords <= 1000) return 1000;
  if (effectiveRecords <= 50_000) return 2000;
  return 3500;
}

export function grossJobRevenuePaise(
  pricing: Pick<DomainPricing, "baseFeePaise" | "perRecordPaise">,
  effectiveRecords: number,
  urlCount = 1,
): number {
  const perUrl =
    pricing.baseFeePaise +
    Math.round((effectiveRecords * pricing.perRecordPaise) / 100) * 100;
  return perUrl * Math.max(1, urlCount);
}

export function workerPayoutCeilingPaise(
  grossRevenuePaise: number,
  effectiveRecords: number,
): number {
  const marginBps = progressiveMarginBps(effectiveRecords);
  const reserved = Math.round((grossRevenuePaise * marginBps) / 10_000);
  return Math.max(grossRevenuePaise - reserved, 0);
}

/** Pages we expect to fetch (~20 rows/page, min 10, max 200). */
export function expectedPaginationPages(effectiveRecords: number): number {
  if (effectiveRecords <= 100) return 1;
  return Math.min(200, Math.max(10, Math.ceil(effectiveRecords / 20)));
}

/** Total fetch tasks including consensus double-fetch on page 1 (§5–6). */
export function expectedFetchTasks(
  effectiveRecords: number,
  requiresConsensus: boolean,
): number {
  const pages = expectedPaginationPages(effectiveRecords);
  if (pages <= 1) {
    return requiresConsensus ? 2 : 1;
  }
  return pages - 1 + (requiresConsensus ? 2 : 1);
}

export function contributorShareBpsForNode(tasksCompleted: number): number {
  if (tasksCompleted > VETERAN_TASK_THRESHOLD) {
    return VETERAN_CONTRIBUTOR_SHARE_BPS;
  }
  const raw = process.env.CONTRIBUTOR_REVENUE_SHARE_BPS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0 && n <= 10_000) return n;
  }
  return INTRO_CONTRIBUTOR_SHARE_BPS;
}

export type JobEconomics = {
  pricing: DomainPricing;
  targetRecords: number;
  budgetRecords: number | null;
  effectiveRecords: number;
  limitedBy: "target" | "budget" | "platform" | null;
  grossRevenuePaise: number;
  platformMarginBps: number;
  workerPayoutCeilingPaise: number;
  expectedFetchTasks: number;
  perTaskRewardPaiseScout: number;
};

export function recordsAffordableByBudget(
  budgetPaise: number,
  pricing: Pick<DomainPricing, "baseFeePaise" | "perRecordPaise">,
  urlCount = 1,
): number {
  const baseTotal = pricing.baseFeePaise * Math.max(1, urlCount);
  const remaining = Math.max(0, budgetPaise - baseTotal);
  const perUrlPaise = Math.floor(
    (remaining * 100) / Math.max(pricing.perRecordPaise, 1),
  );
  return Math.max(0, Math.floor(perUrlPaise / Math.max(1, urlCount)));
}

export function resolveRecordLimits(input: {
  maxRecords?: number;
  budgetPaise?: number;
  urlCount?: number;
  pricing?: Pick<DomainPricing, "baseFeePaise" | "perRecordPaise">;
  defaultTarget?: number;
}): Pick<
  JobEconomics,
  "targetRecords" | "budgetRecords" | "effectiveRecords" | "limitedBy"
> {
  const urlCount = Math.max(1, input.urlCount ?? 1);
  const defaultTarget = input.defaultTarget ?? 500;
  const pricing = input.pricing ?? {
    baseFeePaise: STANDARD_BASE_FEE_PAISE,
    perRecordPaise: STANDARD_PER_RECORD_PAISE,
  };

  const rawTarget =
    input.maxRecords != null && Number.isFinite(input.maxRecords)
      ? Math.round(input.maxRecords)
      : defaultTarget;
  const targetRecords = Math.min(Math.max(1, rawTarget), PLATFORM_MAX_RECORDS);

  const budgetRecords =
    input.budgetPaise != null && input.budgetPaise > 0
      ? recordsAffordableByBudget(input.budgetPaise, pricing, urlCount)
      : null;

  let effectiveRecords = targetRecords;
  if (budgetRecords != null) {
    effectiveRecords = Math.min(effectiveRecords, budgetRecords);
  }

  let limitedBy: JobEconomics["limitedBy"] = "target";
  if (
    budgetRecords != null &&
    effectiveRecords === budgetRecords &&
    budgetRecords < rawTarget
  ) {
    limitedBy = "budget";
  } else if (rawTarget > PLATFORM_MAX_RECORDS) {
    limitedBy = "platform";
  }

  return { targetRecords, budgetRecords, effectiveRecords, limitedBy };
}

export function buildJobEconomics(input: {
  pricing: DomainPricing;
  maxRecords?: number;
  budgetPaise?: number;
  urlCount?: number;
  defaultTarget?: number;
}): JobEconomics {
  const urlCount = Math.max(1, input.urlCount ?? 1);
  const limits = resolveRecordLimits({
    maxRecords: input.maxRecords,
    budgetPaise: input.budgetPaise,
    urlCount,
    pricing: input.pricing,
    defaultTarget: input.defaultTarget,
  });

  let grossRevenuePaise = grossJobRevenuePaise(
    input.pricing,
    limits.effectiveRecords,
    urlCount,
  );

  if (input.budgetPaise != null && input.budgetPaise > 0) {
    grossRevenuePaise = Math.min(grossRevenuePaise, input.budgetPaise);
  }

  const platformMarginBps = progressiveMarginBps(limits.effectiveRecords);
  const ceiling = workerPayoutCeilingPaise(
    grossRevenuePaise,
    limits.effectiveRecords,
  );
  const fetchTasks = expectedFetchTasks(
    limits.effectiveRecords,
    input.pricing.requiresConsensus,
  );

  const perTaskRewardPaiseScout = computeTaskRewardPaise({
    tier: "scout",
    taskType: "fetch",
    edgeInference: false,
    domainBaseFeePaise: input.pricing.baseFeePaise,
    nodeTasksCompleted: 0,
    workerPayoutCeilingPaise: ceiling,
    expectedFetchTasks: fetchTasks,
  });

  return {
    pricing: input.pricing,
    ...limits,
    grossRevenuePaise,
    platformMarginBps,
    workerPayoutCeilingPaise: ceiling,
    expectedFetchTasks: fetchTasks,
    perTaskRewardPaiseScout,
  };
}

export type TaskRewardInput = {
  tier: ComputeTier;
  taskType?: TaskType;
  edgeInference?: boolean;
  domainBaseFeePaise: number;
  nodeTasksCompleted?: number;
  workerPayoutCeilingPaise: number;
  expectedFetchTasks: number;
};

/** Margin-locked per-task reward (§4–5). */
export function computeTaskRewardPaise(input: TaskRewardInput): number {
  const shareBps = contributorShareBpsForNode(input.nodeTasksCompleted ?? 0);
  const baseShare = Math.round(
    (input.domainBaseFeePaise * shareBps) / 10_000,
  );
  const tiered = Math.round(
    baseShare * (TIER_MULTIPLIER[input.tier] ?? 1),
  );
  const typed = Math.round(
    tiered * (TASK_TYPE_MULTIPLIER[input.taskType ?? "fetch"] ?? 1),
  );
  const withGpu = input.edgeInference
    ? Math.round(typed * EDGE_INFERENCE_BONUS_MULTIPLIER)
    : typed;

  const perTaskCap = Math.floor(
    input.workerPayoutCeilingPaise /
      Math.max(input.expectedFetchTasks, 1),
  );

  const reward = Math.min(withGpu, Math.max(perTaskCap, 0));
  return Math.max(reward, 1);
}

/** Serialize economics into _syftin for worker + ledger. */
export function economicsToSyftinMeta(
  economics: JobEconomics,
  extra: {
    max_records: number;
    budget_cents: number;
    effective_max_records: number;
    limited_by?: JobEconomics["limitedBy"];
    pagination?: Record<string, unknown>;
    distributed_pagination?: boolean;
  },
): Record<string, unknown> {
  return {
    max_records: extra.max_records,
    budget_cents: extra.budget_cents,
    effective_max_records: extra.effective_max_records,
    limited_by: extra.limited_by ?? economics.limitedBy,
    pricing: {
      base_fee_paise: economics.pricing.baseFeePaise,
      per_record_paise: economics.pricing.perRecordPaise,
      price_tier: economics.pricing.priceTier,
      requires_consensus: economics.pricing.requiresConsensus,
    },
    gross_revenue_paise: economics.grossRevenuePaise,
    platform_margin_bps: economics.platformMarginBps,
    worker_payout_ceiling_paise: economics.workerPayoutCeilingPaise,
    expected_fetch_tasks: economics.expectedFetchTasks,
    per_task_reward_paise_scout: economics.perTaskRewardPaiseScout,
    ...(extra.pagination ? { pagination: extra.pagination } : {}),
    ...(extra.distributed_pagination
      ? { distributed_pagination: true }
      : {}),
  };
}
