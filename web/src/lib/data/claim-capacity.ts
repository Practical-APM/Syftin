import type { ComputeTier } from "@/lib/contributor/fetch-tier";
import type { NodeResourceTelemetry } from "@/lib/contributor/resource-settings";

const TIER_RANK: Record<ComputeTier, number> = {
  scout: 1,
  ranger: 2,
  titan: 3,
};

/** Higher score = more headroom for heavy fetch tasks. -1 = must not claim. */
export function nodeCapacityScore(
  telemetry: NodeResourceTelemetry | null | undefined,
): number {
  if (!telemetry) return 0.5;
  if (telemetry.work_allowed === false) return -1;

  let score = 1;
  if (
    telemetry.ram_used_mb != null &&
    telemetry.ram_limit_mb != null &&
    telemetry.ram_limit_mb > 0
  ) {
    score -= telemetry.ram_used_mb / telemetry.ram_limit_mb;
  }
  if (
    telemetry.gpu_vram_used_gb != null &&
    telemetry.gpu_vram_limit_gb != null &&
    telemetry.gpu_vram_limit_gb > 0
  ) {
    score -= 0.25 * (telemetry.gpu_vram_used_gb / telemetry.gpu_vram_limit_gb);
  }
  if (telemetry.pause_reason) {
    score -= 0.35;
  }
  return Math.max(-1, Math.min(1, score));
}

export function taskTierRank(tier: ComputeTier | string | null | undefined): number {
  if (!tier || !(tier in TIER_RANK)) return TIER_RANK.scout;
  return TIER_RANK[tier as ComputeTier];
}

/** Sort pending tasks so idle high-tier nodes pick harder work first. */
export function sortTasksForNodeCapacity<T extends { required_tier?: string | null }>(
  tasks: T[],
  capacity: number,
): T[] {
  if (capacity <= 0) return tasks;
  const copy = [...tasks];
  copy.sort((a, b) => {
    const aRank = taskTierRank(a.required_tier);
    const bRank = taskTierRank(b.required_tier);
    if (capacity >= 0.65) {
      return bRank - aRank;
    }
    if (capacity < 0.35) {
      return aRank - bRank;
    }
    return 0;
  });
  return copy;
}

export function nodeCanClaimTier(
  capacity: number,
  requiredTier: ComputeTier | string | null | undefined,
): boolean {
  if (capacity < 0) return false;
  const rank = taskTierRank(requiredTier);
  if (capacity < 0.25 && rank >= TIER_RANK.ranger) return false;
  if (capacity < 0.15 && rank >= TIER_RANK.scout + 1) return false;
  return true;
}
