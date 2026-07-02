import { createAdminClient } from "@/lib/supabase/admin";
import { computeFetchRewardPaise } from "@/lib/contributor/economics";
import {
  type ComputeTier,
  nodeEffectiveTier,
  nodeMeetsFetchRequirement,
} from "@/lib/contributor/fetch-tier";
import { TIER_DETAILS } from "@/lib/contributor/tier";
import type { TaskType } from "@/lib/types/jobs";
import { computeTaskRewardPaise } from "@/lib/contributor/economics";
import { recordNodeSuccessDomain } from "@/lib/data/subscriptions";

export type FetchTask = {
  id: string;
  job_id: string;
  target_url: string;
  domain: string;
  status: string;
  required_tier?: ComputeTier;
  task_type: TaskType;
  consensus_group_id?: string | null;
  required_region?: string | null;
  example_schema?: Record<string, unknown>;
};

const MAX_HTML_BYTES = 2_000_000;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const PENDING_SCAN_LIMIT = 25;

/** Re-queue fetch tasks stuck in claimed state (crashed node). */
export async function reclaimStaleFetchClaims(): Promise<number> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
  const { data, error } = await admin
    .from("fetch_tasks")
    .update({
      status: "pending",
      claimed_by_node_id: null,
      claimed_at: null,
      error_message: "Claim expired — re-queued for another node",
    })
    .eq("status", "claimed")
    .lt("claimed_at", cutoff)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function claimNextFetchTask(
  nodeId: string,
  contributorId: string,
): Promise<FetchTask | null> {
  await reclaimStaleFetchClaims();

  const admin = createAdminClient();

  const { data: contributor } = await admin
    .from("contributors")
    .select("metered_pause, network_mode, is_active")
    .eq("id", contributorId)
    .single();

  if (!contributor?.is_active || contributor.network_mode === "paused") {
    return null;
  }

  if (contributor.network_mode === "metered") {
    return null;
  }

  const { data: node } = await admin
    .from("contributor_nodes")
    .select(
      "connection_metered, compute_tier, detected_tier, playwright_ready",
    )
    .eq("id", nodeId)
    .single();

  if (contributor.metered_pause && node?.connection_metered) {
    return null;
  }

  if (!node) return null;

  const nodeTier = nodeEffectiveTier(node.compute_tier, node.detected_tier);
  const playwrightReady = Boolean(node.playwright_ready);

  // Fetch the node's region for geo-routing
  const { data: nodeGeo } = await admin
    .from("contributor_nodes")
    .select("region")
    .eq("id", nodeId)
    .maybeSingle();
  const nodeRegion: string | null = (nodeGeo?.region as string | null) ?? null;

  const { data: pending, error } = await admin
    .from("fetch_tasks")
    .select("id, job_id, target_url, domain, status, required_tier, task_type, consensus_group_id, required_region, jobs(example_schema)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(PENDING_SCAN_LIMIT);

  if (error || !pending?.length) return null;

  const { data: sub } = await admin
    .from("node_subscriptions")
    .select("last_success_domain")
    .eq("node_id", nodeId)
    .maybeSingle();

  const affinityDomain = sub?.last_success_domain;

  if (affinityDomain) {
    pending.sort((a, b) => {
      if (a.domain === affinityDomain && b.domain !== affinityDomain) return -1;
      if (b.domain === affinityDomain && a.domain !== affinityDomain) return 1;
      return 0;
    });
  }

  const { data: nodeHistory } = await admin
    .from("fetch_tasks")
    .select("consensus_group_id")
    .eq("claimed_by_node_id", nodeId)
    .not("consensus_group_id", "is", null);

  const claimedGroups = new Set(nodeHistory?.map(t => t.consensus_group_id));

  const match = pending.find((task) => {
    // Consensus: don't let the same node claim both tasks in a group
    if (task.consensus_group_id && claimedGroups.has(task.consensus_group_id)) {
      return false;
    }

    // Geo-routing: if task requires a region, only allow nodes from that region.
    // After 60 s without a claim we let any node take it (stale fallback).
    if (task.required_region) {
      if (nodeRegion && nodeRegion !== task.required_region) {
        return false;
      }
    }

    const tierMatch = nodeMeetsFetchRequirement(
      nodeTier,
      (task.required_tier ?? "scout") as ComputeTier,
      playwrightReady,
    );
    if (!tierMatch) return false;

    // Phase 3: Task type check
    if (task.task_type === "parse" || task.task_type === "validate" || task.task_type === "enrich") {
      if (!TIER_DETAILS[nodeTier].canParse) return false;
    }

    return true;
  });

  if (!match) return null;

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("fetch_tasks")
    .update({
      status: "claimed",
      claimed_by_node_id: nodeId,
      claimed_at: now,
    })
    .eq("id", match.id)
    .eq("status", "pending")
    .select("id, job_id, target_url, domain, status, required_tier, task_type, consensus_group_id, jobs(example_schema)")
    .maybeSingle();

  if (claimError || !claimed) return null;

  const jobRow = claimed.jobs as { example_schema?: Record<string, unknown> } | null;
  const { jobs: _jobs, ...task } = claimed as typeof claimed & {
    jobs?: { example_schema?: Record<string, unknown> } | null;
  };

  return {
    ...task,
    example_schema: jobRow?.example_schema,
  } as FetchTask;
}

export type CompleteFetchOptions = {
  parsedOutput?: unknown[];
  edgeInference?: boolean;
  inferenceModel?: string | null;
};

export async function completeFetchTask(
  taskId: string,
  nodeId: string,
  html: string,
  options?: CompleteFetchOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    return { ok: false, error: "HTML payload too large." };
  }

  const admin = createAdminClient();
  const { data: task, error: fetchError } = await admin
    .from("fetch_tasks")
    .select("id, claimed_by_node_id, status, required_tier, task_type, domain")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) return { ok: false, error: "Task not found." };
  if (task.claimed_by_node_id !== nodeId) {
    return { ok: false, error: "Task not claimed by this node." };
  }
  if (task.status !== "claimed") {
    return { ok: false, error: "Task is not in claimed state." };
  }

  const now = new Date().toISOString();
  const tier = (task.required_tier ?? "scout") as ComputeTier;
  const edgeInference = Boolean(options?.edgeInference);
  const rewardPaise = computeTaskRewardPaise(tier, task.task_type as TaskType, edgeInference);

  const patch: Record<string, unknown> = {
    status: "completed",
    html_payload: html,
    html_byte_size: Buffer.byteLength(html, "utf8"),
    completed_at: now,
    reward_paise: rewardPaise,
  };

  if (options?.parsedOutput !== undefined) {
    patch.parsed_output = options.parsedOutput;
    patch.edge_inference = edgeInference;
    patch.inference_model = options.inferenceModel ?? null;
  }

  const { error } = await admin.from("fetch_tasks").update(patch).eq("id", taskId);

  if (error) return { ok: false, error: error.message };
  
  // Record domain affinity for future SSE push
  await recordNodeSuccessDomain(nodeId, task.domain).catch(console.error);

  // Increase reputation
  const { data: node } = await admin.from("contributor_nodes").select("contributor_id").eq("id", nodeId).single();
  if (node) {
     await admin.rpc("increment_reputation", { c_id: node.contributor_id, amount: 1 });
  }
  
  return { ok: true };
}

export async function failFetchTask(
  taskId: string,
  nodeId: string,
  message: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("fetch_tasks")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("claimed_by_node_id", nodeId);

  // Decrease reputation
  const { data: node } = await admin.from("contributor_nodes").select("contributor_id").eq("id", nodeId).single();
  if (node) {
     await admin.rpc("increment_reputation", { c_id: node.contributor_id, amount: -5 });
  }
}

export async function getCompletedFetchHtml(
  jobId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fetch_tasks")
    .select("html_payload")
    .eq("job_id", jobId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.html_payload) return null;
  return data.html_payload as string;
}

export async function getCompletedEdgeParse(
  jobId: string,
): Promise<{ parsed: unknown[]; model: string | null } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fetch_tasks")
    .select("parsed_output, edge_inference, inference_model")
    .eq("job_id", jobId)
    .eq("status", "completed")
    .eq("edge_inference", true)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.parsed_output || !data.edge_inference) return null;
  const parsed = data.parsed_output;
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return {
    parsed,
    model: (data.inference_model as string | null) ?? null,
  };
}
