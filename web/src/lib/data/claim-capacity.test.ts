import { nodeCapacityScore, sortTasksForNodeCapacity, nodeCanClaimTier } from "./claim-capacity";
import type { NodeResourceTelemetry } from "@/lib/contributor/resource-settings";

describe("claim-capacity", () => {
  it("scores idle nodes higher than paused nodes", () => {
    const idle = nodeCapacityScore({
      work_allowed: true,
      ram_used_mb: 100,
      ram_limit_mb: 8000,
    });
    const paused = nodeCapacityScore({ work_allowed: false });
    expect(idle).toBeGreaterThan(paused);
    expect(paused).toBe(-1);
  });

  it("prefers titan tasks when capacity is high", () => {
    const tasks = [
      { required_tier: "scout" },
      { required_tier: "titan" },
    ];
    const sorted = sortTasksForNodeCapacity(tasks, 0.8);
    expect(sorted[0].required_tier).toBe("titan");
  });

  it("blocks ranger claims when capacity is low", () => {
    expect(nodeCanClaimTier(0.1, "ranger")).toBe(false);
    expect(nodeCanClaimTier(0.8, "ranger")).toBe(true);
  });
});
