import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function hashTaskOutput(html: string, parsedOutput?: unknown[]): string {
  const payload =
    parsedOutput && parsedOutput.length > 0
      ? JSON.stringify(parsedOutput)
      : html;
  return createHash("sha256").update(payload).digest("hex");
}

type ConsensusTaskRow = {
  id: string;
  claimed_by_node_id: string | null;
  output_hash: string | null;
  consensus_status: string | null;
  status: string;
  reward_paise: number;
};

/**
 * After a consensus-group fetch completes, verify hashes or spawn arbiter (§6).
 */
export async function resolveConsensusGroup(
  groupId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: tasks, error } = await admin
    .from("fetch_tasks")
    .select(
      "id, claimed_by_node_id, output_hash, consensus_status, status, reward_paise",
    )
    .eq("consensus_group_id", groupId)
    .eq("is_consensus_arbiter", false);

  if (error || !tasks || tasks.length < 2) return;

  const completed = (tasks as ConsensusTaskRow[]).filter(
    (t) => t.status === "completed" && t.output_hash,
  );
  if (completed.length < 2) return;

  const hashes = new Set(completed.map((t) => t.output_hash));
  const now = new Date().toISOString();

  if (hashes.size === 1) {
    const ids = completed.map((t) => t.id);
    await admin
      .from("fetch_tasks")
      .update({ consensus_status: "verified" })
      .in("id", ids);
    return;
  }

  // Mismatch: withhold pay, penalize reputation, spawn arbiter
  const disputedIds = completed.map((t) => t.id);
  await admin
    .from("fetch_tasks")
    .update({
      consensus_status: "disputed",
      reward_paise: 0,
      error_message: "Consensus mismatch — payout withheld",
    })
    .in("id", disputedIds);

  for (const task of completed) {
    if (!task.claimed_by_node_id) continue;
    const { data: node } = await admin
      .from("contributor_nodes")
      .select("contributor_id")
      .eq("id", task.claimed_by_node_id)
      .single();
    if (node?.contributor_id) {
      await admin.rpc("increment_reputation", {
        c_id: node.contributor_id,
        amount: -10,
      });
    }
  }

  const sample = completed[0];
  const { data: arbiterExists } = await admin
    .from("fetch_tasks")
    .select("id")
    .eq("consensus_group_id", groupId)
    .eq("is_consensus_arbiter", true)
    .maybeSingle();

  if (!arbiterExists && sample) {
    const { data: original } = await admin
      .from("fetch_tasks")
      .select("job_id, target_url, domain, required_tier, required_region, reward_paise")
      .eq("id", sample.id)
      .single();

    if (original) {
      await admin.from("fetch_tasks").insert({
        job_id: original.job_id,
        target_url: original.target_url,
        domain: original.domain,
        status: "pending",
        page_index: 0,
        reward_paise: original.reward_paise,
        required_tier: original.required_tier,
        required_region: original.required_region,
        consensus_group_id: groupId,
        is_consensus_arbiter: true,
      });
    }
  }
}
