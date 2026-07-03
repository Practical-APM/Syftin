import type { ComputeTier } from "@/lib/contributor/tier";
import { DEFAULT_JOB_COST_CENTS } from "@/lib/env";
import type { TaskType } from "@/lib/types/jobs";
import {
  computeTaskRewardPaise as computeTaskRewardWithLock,
  contributorShareBpsForNode,
  INTRO_CONTRIBUTOR_SHARE_BPS,
  EDGE_INFERENCE_BONUS_MULTIPLIER,
  progressiveMarginBps,
  workerPayoutCeilingPaise,
  grossJobRevenuePaise,
  type TaskRewardInput,
} from "@/lib/pricing/job-economics";
import {
  STANDARD_BASE_FEE_PAISE,
  defaultPricingForDomain,
} from "@/lib/pricing/domain-pricing";

export {
  INTRO_CONTRIBUTOR_SHARE_BPS,
  EDGE_INFERENCE_BONUS_MULTIPLIER,
  progressiveMarginBps,
  workerPayoutCeilingPaise,
  grossJobRevenuePaise,
  contributorShareBpsForNode,
} from "@/lib/pricing/job-economics";

/** Buyer job price in paise (legacy flat base; domain pricing preferred). */
export function jobPricePaise(): number {
  const raw = process.env.JOB_PRICE_PAISE?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_JOB_COST_CENTS;
}

/** Introductory contributor share in basis points (7000 = 70%). */
export function contributorShareBps(): number {
  return contributorShareBpsForNode(0);
}

export type JobRewardContext = {
  domain?: string;
  domainBaseFeePaise?: number;
  effectiveRecords?: number;
  grossRevenuePaise?: number;
  workerPayoutCeilingPaise?: number;
  expectedFetchTasks?: number;
  nodeTasksCompleted?: number;
};

function resolveRewardContext(ctx?: JobRewardContext): TaskRewardInput {
  const pricing = ctx?.domain
    ? defaultPricingForDomain(ctx.domain)
    : null;
  const baseFee =
    ctx?.domainBaseFeePaise ?? pricing?.baseFeePaise ?? jobPricePaise();
  const effective = ctx?.effectiveRecords ?? 500;
  const gross =
    ctx?.grossRevenuePaise ??
    grossJobRevenuePaise(
      {
        baseFeePaise: baseFee,
        perRecordPaise: pricing?.perRecordPaise ?? 10,
      },
      effective,
    );
  const ceiling =
    ctx?.workerPayoutCeilingPaise ??
    workerPayoutCeilingPaise(gross, effective);
  const expectedTasks = ctx?.expectedFetchTasks ?? 1;

  return {
    tier: "scout",
    domainBaseFeePaise: baseFee,
    nodeTasksCompleted: ctx?.nodeTasksCompleted ?? 0,
    workerPayoutCeilingPaise: ceiling,
    expectedFetchTasks: expectedTasks,
  };
}

export function computeTaskRewardPaise(
  tier: ComputeTier,
  taskType: TaskType = "fetch",
  edgeInference = false,
  ctx?: JobRewardContext,
): number {
  const base = resolveRewardContext(ctx);
  return computeTaskRewardWithLock({
    ...base,
    tier,
    taskType,
    edgeInference,
  });
}

export function computeFetchRewardPaise(
  tier: ComputeTier,
  edgeInference = false,
  ctx?: JobRewardContext,
): number {
  return computeTaskRewardPaise(tier, "fetch", edgeInference, ctx);
}

/** @deprecated Use progressive margin via workerPayoutCeilingPaise */
export function minPlatformMarginBps(): number {
  const raw = process.env.MIN_PLATFORM_MARGIN_BPS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0 && n < 10_000) return n;
  }
  return 1000;
}

export function maxContributorPayoutPaise(jobPrice = jobPricePaise()): number {
  const floor = Math.round((jobPrice * minPlatformMarginBps()) / 10_000);
  return Math.max(jobPrice - floor, 0);
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
  progressiveMargins: { small: number; medium: number; large: number };
} {
  const share = contributorShareBps() / 100;
  const ctx: JobRewardContext = {
    domainBaseFeePaise: STANDARD_BASE_FEE_PAISE,
    effectiveRecords: 500,
    grossRevenuePaise: grossJobRevenuePaise(
      { baseFeePaise: STANDARD_BASE_FEE_PAISE, perRecordPaise: 10 },
      500,
    ),
    workerPayoutCeilingPaise: workerPayoutCeilingPaise(
      grossJobRevenuePaise(
        { baseFeePaise: STANDARD_BASE_FEE_PAISE, perRecordPaise: 10 },
        500,
      ),
      500,
    ),
    expectedFetchTasks: 25,
  };
  return {
    jobPricePaise: jobPricePaise(),
    contributorSharePercent: share,
    platformSharePercent: 100 - share,
    scoutRewardPaise: computeFetchRewardPaise("scout", false, ctx),
    rangerRewardPaise: computeFetchRewardPaise("ranger", false, ctx),
    titanRewardPaise: computeFetchRewardPaise("titan", false, ctx),
    titanGpuRewardPaise: computeFetchRewardPaise("titan", true, ctx),
    maxContributorPayoutPaise: maxContributorPayoutPaise(),
    progressiveMargins: { small: 10, medium: 20, large: 35 },
  };
}
