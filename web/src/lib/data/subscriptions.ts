import { createAdminClient } from "@/lib/supabase/admin";
import type { ComputeTier } from "@/lib/contributor/fetch-tier";

export type NodeSubscription = {
  node_id: string;
  contributor_id: string;
  tier: ComputeTier;
  is_online: boolean;
  last_success_domain: string | null;
  last_ping_at: string;
};

export async function upsertNodeSubscription(
  nodeId: string,
  contributorId: string,
  tier: ComputeTier,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("node_subscriptions")
    .upsert(
      {
        node_id: nodeId,
        contributor_id: contributorId,
        tier,
        is_online: true,
        last_ping_at: new Date().toISOString(),
      },
      { onConflict: "node_id" }
    );
}

export async function updateNodeOffline(nodeId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("node_subscriptions")
    .update({ is_online: false })
    .eq("node_id", nodeId);
}

export async function recordNodeSuccessDomain(nodeId: string, domain: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("node_subscriptions")
    .update({ last_success_domain: domain })
    .eq("node_id", nodeId);
}
