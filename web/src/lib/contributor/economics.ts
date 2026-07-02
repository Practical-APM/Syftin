import type { ComputeTier } from "@/lib/contributor/tier";
import { DEFAULT_JOB_COST_CENTS } from "@/lib/env";

/** Buyer job price in paise (credit ledger uses paise; field named `*_cents`). */
export function jobPricePaise(): number {
  const raw = process.env.JOB_PRICE_PAISE?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_JOB_COST_CENTS;
}

/** Contributor share of buyer job price, in basis points (7000 = 70%). */
export function contributorShareBps(): number {
  const raw = process.env.CONTRIBUTOR_REVENUE_SHARE_BPS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0 && n <= 10_000) return n;
  }
  return 7000;
}

const TIER_MULTIPLIER: Record<ComputeTier, number> = {
  scout: 1,
  ranger: 1.25,
  titan: 1.5,
};

/** Extra multiplier when the node runs local GPU inference (Ollama). */
export const EDGE_INFERENCE_BONUS_MULTIPLIER = 1.25;

/** Minimum platform margin, in basis points (1000 = 10% of job price). */
export function minPlatformMarginBps(): number {
  const raw = process.env.MIN_PLATFORM_MARGIN_BPS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0 && n < 10_000) return n;
  }
  return 1000;
}

export function maxContributorPayoutPaise(): number {
  const floor = Math.round((jobPricePaise() * minPlatformMarginBps()) / 10_000);
  return Math.max(jobPricePaise() - floor, 0);
}

import type { TaskType } from "@/lib/types/jobs";

export function computeTaskRewardPaise(
  tier: ComputeTier,
  taskType: TaskType = "fetch",
  edgeInference = false,
): number {
  const baseShare = Math.round((jobPricePaise() * contributorShareBps()) / 10_000);
  const tiered = Math.round(baseShare * (TIER_MULTIPLIER[tier] ?? 1));
  
  // Phase 3: distinct task type rewards
  const TASK_TYPE_MULTIPLIER: Record<TaskType, number> = {
    fetch: 1.0,
    parse: 1.5,     // Parsing is heavier
    validate: 0.5,  // Validating is lightweight
    enrich: 1.25,
  };
  
  const typed = Math.round(tiered * (TASK_TYPE_MULTIPLIER[taskType] ?? 1.0));

  const withGpu = edgeInference
    ? Math.round(typed * EDGE_INFERENCE_BONUS_MULTIPLIER)
    : typed;
  return Math.min(withGpu, maxContributorPayoutPaise());
}

export function computeFetchRewardPaise(
  tier: ComputeTier,
  edgeInference = false,
): number {
  return computeTaskRewardPaise(tier, "fetch", edgeInference);
}

export function platformShareBps(): number {
  return 10_000 - contributorShareBps();
}

export function formatRupeeFromPaise(paise: number): string {
  return `₹${(paise / 100).toFixed(paise % 100 === 0 ? 0 : 2)}`;
}

export function economicsSummary(): {
  jobPricePaise: number;
  contributorSharePercent: number;
  platformSharePercent: number;
  scoutRewardPaise: number;
  rangerRewardPaise: number;
  titanRewardPaise: number;
  titanGpuRewardPaise: number;
  maxContributorPayoutPaise: number;
} {
  const share = contributorShareBps() / 100;
  return {
    jobPricePaise: jobPricePaise(),
    contributorSharePercent: share,
    platformSharePercent: 100 - share,
    scoutRewardPaise: computeFetchRewardPaise("scout"),
    rangerRewardPaise: computeFetchRewardPaise("ranger"),
    titanRewardPaise: computeFetchRewardPaise("titan"),
    titanGpuRewardPaise: computeFetchRewardPaise("titan", true),
    maxContributorPayoutPaise: maxContributorPayoutPaise(),
  };
}
