import { createAdminClient } from "@/lib/supabase/admin";
import { computeFetchRewardPaise } from "@/lib/contributor/economics";
import { readSyftinEconomics } from "@/lib/pricing/read-syftin-economics";
import {
  type ComputeTier,
  nodeEffectiveTier,
  nodeMeetsFetchRequirement,
} from "@/lib/contributor/fetch-tier";
import { TIER_DETAILS } from "@/lib/contributor/tier";
import type { TaskType } from "@/lib/types/jobs";
import { computeTaskRewardPaise } from "@/lib/contributor/economics";
import { recordNodeSuccessDomain } from "@/lib/data/subscriptions";
import { hashTaskOutput, resolveConsensusGroup } from "@/lib/data/consensus";
import { getWhitelistEntryForDomain } from "@/lib/data/domains";
import {
  fetchPayloadHtml,
  isPayloadStorageConfigured,
  payloadObjectExists,
} from "@/lib/storage/payload-storage";
import {
  nodeCanClaimTier,
  nodeCapacityScore,
  sortTasksForNodeCapacity,
} from "@/lib/data/claim-capacity";
import type { NodeResourceTelemetry } from "@/lib/contributor/resource-settings";
import { isIpAtCapacity } from "@/lib/data/fleet-caps";

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
  stealth_profile?: Record<string, unknown> | null;
};

const MAX_HTML_BYTES = 2_000_000;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const PENDING_SCAN_LIMIT = 25;
/** Anti-hoarding: max concurrent leases per node (revenue_pipeline.md §6) */
const MAX_CONCURRENT_LEASES = 3;

/** Stop in-flight contributor work when a job is cancelled. */
export async function expireFetchTasksForJob(
  jobId: string,
  reason = "Job cancelled",
): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();
  await admin
    .from("fetch_tasks")
    .update({
      status: "expired",
      claimed_by_node_id: null,
      claimed_at: null,
      error_message: reason.slice(0, 500),
    })
    .eq("job_id", jobId)
    .in("status", ["pending", "claimed"]);
}

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
  clientIp?: string,
): Promise<FetchTask | null> {
  await reclaimStaleFetchClaims();

  const admin = createAdminClient();

  const { data: contributor } = await admin
    .from("contributors")
    .select("metered_pause, network_mode, is_active, user_id")
    .eq("id", contributorId)
    .single();

  if (!contributor?.is_active || contributor.network_mode === "paused") {
    return null;
  }

  if (contributor.network_mode === "metered") {
    return null;
  }

  let buyerOrgIds = new Set<string>();
  if (contributor.user_id) {
    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", contributor.user_id);
    buyerOrgIds = new Set(
      (memberships ?? []).map((m: { organization_id: string }) => m.organization_id),
    );
  }

  const { data: node } = await admin
    .from("contributor_nodes")
    .select(
      "connection_metered, compute_tier, detected_tier, playwright_ready, ip_cooldown_until, last_seen_ip, resource_telemetry",
    )
    .eq("id", nodeId)
    .single();

  if (contributor.metered_pause && node?.connection_metered) {
    return null;
  }

  if (!node) return null;

  const capacity = nodeCapacityScore(
    node.resource_telemetry as NodeResourceTelemetry | null,
  );
  if (capacity < 0) return null;

  const cooldownUntil = node.ip_cooldown_until as string | null;
  if (cooldownUntil && new Date(cooldownUntil).getTime() > Date.now()) {
    return null;
  }

  const effectiveIp = clientIp ?? (node.last_seen_ip as string | null);
  if (effectiveIp) {
    const ipCap = await isIpAtCapacity(admin, effectiveIp);
    if (ipCap.blocked) {
      if (ipCap.applyCooldown) {
        const { setIpCooldownForNode } = await import("@/lib/data/fleet-caps");
        await setIpCooldownForNode(
          admin,
          nodeId,
          effectiveIp,
          "hourly claim cap",
        );
      }
      return null;
    }
  }

  const { count: activeLeases } = await admin
    .from("fetch_tasks")
    .select("id", { count: "exact", head: true })
    .eq("claimed_by_node_id", nodeId)
    .eq("status", "claimed");

  if ((activeLeases ?? 0) >= MAX_CONCURRENT_LEASES) {
    return null;
  }

  const nodeTier = nodeEffectiveTier(node.compute_tier, node.detected_tier);
  const playwrightReady = Boolean(node.playwright_ready);

  if (clientIp) {
    await admin
      .from("contributor_nodes")
      .update({ last_seen_ip: clientIp, updated_at: new Date().toISOString() })
      .eq("id", nodeId);
  }

  const { data: suspendedDomains } = await admin
    .from("whitelist_domains")
    .select("domain")
    .eq("execution_suspended", true);
  const suspended = new Set(
    (suspendedDomains ?? []).map((d: { domain: string }) => d.domain),
  );

  // Fetch the node's region for geo-routing
  const { data: nodeGeo } = await admin
    .from("contributor_nodes")
    .select("region")
    .eq("id", nodeId)
    .maybeSingle();
  const nodeRegion: string | null = (nodeGeo?.region as string | null) ?? null;

  const { data: pending, error } = await admin
    .from("fetch_tasks")
    .select("id, job_id, target_url, domain, status, required_tier, task_type, consensus_group_id, required_region, priority, jobs(organization_id, example_schema)")
    .eq("status", "pending")
    .order("priority", { ascending: false })
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

  const capacitySorted = sortTasksForNodeCapacity(pending, capacity);

  const { data: nodeHistory } = await admin
    .from("fetch_tasks")
    .select("consensus_group_id")
    .eq("claimed_by_node_id", nodeId)
    .not("consensus_group_id", "is", null);

  const claimedGroups = new Set(nodeHistory?.map(t => t.consensus_group_id));

  const consensusGroupIds = [
    ...new Set(
      pending
        .map((t) => t.consensus_group_id)
        .filter((g): g is string => Boolean(g)),
    ),
  ];
  const collusionBlockedGroups = new Set<string>();
  if (consensusGroupIds.length > 0) {
    const { data: activeClaims } = await admin
      .from("fetch_tasks")
      .select(
        "consensus_group_id, contributor_nodes!inner(contributor_id, last_seen_ip)",
      )
      .in("consensus_group_id", consensusGroupIds)
      .eq("status", "claimed");

    for (const row of activeClaims ?? []) {
      const groupId = row.consensus_group_id as string;
      const nodeRow = row.contributor_nodes as
        | { contributor_id: string; last_seen_ip: string | null }
        | { contributor_id: string; last_seen_ip: string | null }[];
      const meta = Array.isArray(nodeRow) ? nodeRow[0] : nodeRow;
      if (!meta) continue;
      if (meta.contributor_id === contributorId) {
        collusionBlockedGroups.add(groupId);
      }
      if (clientIp && meta.last_seen_ip && meta.last_seen_ip === clientIp) {
        collusionBlockedGroups.add(groupId);
      }
    }
  }

  const match = capacitySorted.find((task) => {
    if (suspended.has(task.domain)) return false;

    if (
      !nodeCanClaimTier(capacity, (task.required_tier ?? "scout") as ComputeTier)
    ) {
      return false;
    }

    const jobRow = task.jobs as
      | { organization_id?: string; example_schema?: Record<string, unknown> }
      | null;
    if (
      jobRow?.organization_id &&
      buyerOrgIds.has(jobRow.organization_id)
    ) {
      return false;
    }

    if (
      task.consensus_group_id &&
      collusionBlockedGroups.has(task.consensus_group_id)
    ) {
      return false;
    }

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
    .select("id, job_id, target_url, domain, status, required_tier, task_type, consensus_group_id, jobs(organization_id, example_schema)")
    .maybeSingle();

  if (claimError || !claimed) return null;

  const jobRow = claimed.jobs as { example_schema?: Record<string, unknown> } | null;
  const { jobs: _jobs, ...task } = claimed as typeof claimed & {
    jobs?: { example_schema?: Record<string, unknown> } | null;
  };

  const whitelist = await getWhitelistEntryForDomain(task.domain as string);

  return {
    ...task,
    example_schema: jobRow?.example_schema,
    stealth_profile: whitelist?.stealth_profile ?? null,
  } as FetchTask;
}

export type CompleteFetchOptions = {
  parsedOutput?: unknown[];
  edgeInference?: boolean;
  inferenceModel?: string | null;
  /** Object storage key after gzip upload (§9 payload offload). */
  payloadKey?: string;
  payloadEncoding?: "gzip" | "plain";
};

/** Resolve HTML for a fetch task from inline DB column or object storage. */
export async function resolveFetchTaskHtml(taskId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fetch_tasks")
    .select("html_payload, payload_storage_key")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.html_payload) return data.html_payload as string;

  const key = data.payload_storage_key as string | null;
  if (!key) return null;

  try {
    return await fetchPayloadHtml(key);
  } catch (err) {
    console.error(`[fetch-payload] task=${taskId}:`, err);
    return null;
  }
}

export async function completeFetchTask(
  taskId: string,
  nodeId: string,
  html: string | null,
  options?: CompleteFetchOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payloadKey = options?.payloadKey?.trim();
  const useOffload = Boolean(payloadKey && isPayloadStorageConfigured());

  if (!useOffload) {
    if (!html) {
      return { ok: false, error: "HTML payload required." };
    }
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return { ok: false, error: "HTML payload too large." };
    }
  }

  const admin = createAdminClient();
  const { data: task, error: fetchError } = await admin
    .from("fetch_tasks")
    .select(
      "id, claimed_by_node_id, status, required_tier, task_type, domain, job_id, target_url, consensus_group_id, jobs(organization_id, example_schema)",
    )
    .eq("id", taskId)
    .single();

  if (fetchError || !task) return { ok: false, error: "Task not found." };

  const { isUrlAllowedForOrg } = await import("@/lib/data/org-domains");
  const jobOrg = task.jobs as { example_schema?: Record<string, unknown>; organization_id?: string } | null;
  const orgId = jobOrg?.organization_id;
  if (orgId && task.target_url) {
    const allowed = await isUrlAllowedForOrg(task.target_url as string, orgId);
    if (!allowed) {
      return { ok: false, error: "Task URL is not on the approved domain whitelist." };
    }
  }

  // Idempotency: already completed — return success (§6)
  if (task.status === "completed") {
    return { ok: true };
  }

  if (task.claimed_by_node_id !== nodeId) {
    return { ok: false, error: "Task not claimed by this node." };
  }
  if (task.status !== "claimed") {
    return {
      ok: false,
      error: "Task lease expired or was reassigned — clear local cache.",
    };
  }

  const now = new Date().toISOString();
  const tier = (task.required_tier ?? "scout") as ComputeTier;

  const { data: nodeRow } = await admin
    .from("contributor_nodes")
    .select("tasks_completed, capabilities")
    .eq("id", nodeId)
    .single();

  const parsedOutput = Array.isArray(options?.parsedOutput)
    ? options.parsedOutput
    : undefined;
  const caps = nodeRow?.capabilities as
    | { gpu_inference_ready?: boolean }
    | null;
  const edgeInference =
    Boolean(options?.edgeInference) &&
    Boolean(caps?.gpu_inference_ready) &&
    Boolean(parsedOutput && parsedOutput.length > 0);

  const jobRow = task.jobs as { example_schema?: Record<string, unknown> } | null;
  const whitelistEntry = await getWhitelistEntryForDomain(task.domain);
  const economicsCtx = readSyftinEconomics(
    jobRow?.example_schema,
    task.domain,
    whitelistEntry,
  );
  const rewardPaise = computeTaskRewardPaise(
    tier,
    task.task_type as TaskType,
    edgeInference,
    {
      ...economicsCtx,
      nodeTasksCompleted: Number(nodeRow?.tasks_completed ?? 0),
    },
  );

  let resolvedHtml = html;
  let byteSize = html ? Buffer.byteLength(html, "utf8") : 0;

  if (useOffload && payloadKey) {
    const exists = await payloadObjectExists(payloadKey);
    if (!exists) {
      return {
        ok: false,
        error: "Uploaded payload not found in object storage. Upload before completing.",
      };
    }
    try {
      resolvedHtml = await fetchPayloadHtml(payloadKey);
    } catch {
      return { ok: false, error: "Could not read uploaded payload." };
    }
    byteSize = Buffer.byteLength(resolvedHtml, "utf8");
    if (byteSize > MAX_HTML_BYTES) {
      return { ok: false, error: "HTML payload too large." };
    }
  }

  const patch: Record<string, unknown> = {
    status: "completed",
    html_byte_size: byteSize,
    completed_at: now,
    reward_paise: rewardPaise,
    output_hash: hashTaskOutput(resolvedHtml ?? "", options?.parsedOutput),
    ...(task.consensus_group_id ? { consensus_status: "pending" } : {}),
  };

  if (useOffload && payloadKey) {
    patch.html_payload = null;
    patch.payload_storage_key = payloadKey;
    patch.payload_encoding = options?.payloadEncoding ?? "gzip";
    patch.payload_stored_at = now;
  } else {
    patch.html_payload = resolvedHtml;
    patch.payload_storage_key = null;
    patch.payload_encoding = null;
    patch.payload_stored_at = null;
  }

  if (options?.parsedOutput !== undefined) {
    patch.parsed_output = parsedOutput;
    patch.edge_inference = edgeInference;
    patch.inference_model = options.inferenceModel ?? null;
  }

  const { error } = await admin.from("fetch_tasks").update(patch).eq("id", taskId);

  if (error) return { ok: false, error: error.message };

  if (task.consensus_group_id) {
    await resolveConsensusGroup(task.consensus_group_id).catch(console.error);
  }
  
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

  const { data: nodeRow } = await admin
    .from("contributor_nodes")
    .select("last_seen_ip")
    .eq("id", nodeId)
    .maybeSingle();

  await admin
    .from("fetch_tasks")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("claimed_by_node_id", nodeId);

  if (
    message.toLowerCase().includes("403") ||
    message.toLowerCase().includes("captcha") ||
    message.toLowerCase().includes("blocked")
  ) {
    const { setIpCooldownForNode } = await import("@/lib/data/fleet-caps");
    await setIpCooldownForNode(
      admin,
      nodeId,
      nodeRow?.last_seen_ip as string | null,
      "fetch blocked (403/captcha)",
    );
  } else {
    const { maybeCooldownIpForFailureSpike } = await import(
      "@/lib/data/fleet-caps"
    );
    await maybeCooldownIpForFailureSpike(
      admin,
      nodeRow?.last_seen_ip as string | null,
      nodeId,
    );
  }

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
    .select("id, html_payload, payload_storage_key")
    .eq("job_id", jobId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if (data.html_payload) return data.html_payload as string;
  if (data.payload_storage_key) {
    return resolveFetchTaskHtml(data.id as string);
  }
  return null;
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
