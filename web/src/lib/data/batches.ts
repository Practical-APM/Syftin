import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSessionOrg, type SessionOrg } from "@/lib/auth/org";
import {
  isAuthRequired,
  isPhase2Enabled,
  isPhase3Enabled,
  isSupabaseConfigured,
} from "@/lib/env";
import {
  getOrgDomainList,
  isUrlAllowedForOrg,
} from "@/lib/data/org-domains";
import { extractDomain, getWhitelistRejectionMessage } from "@/lib/constants/whitelist";
import {
  chargeBatchCredits,
  createFetchTaskForJob,
  getCreditBalance,
  isCreditsEnforced,
} from "@/lib/data/credits";
import { requiredTierForDomain } from "@/lib/contributor/fetch-tier";
import { sanitizeJobInput } from "@/lib/sanitize";
import { assertOrgBillingUnlocked } from "@/lib/data/billing-guards";
import { assertOrgEmailVerifiedForJobs } from "@/lib/data/org-gates";
import { assertDomainExecutionAllowed } from "@/lib/data/domains";
import { assertDomainLegalBasisForSchema } from "@/lib/compliance/schema-sensitive";
import { buildServerBatchSchema } from "@/lib/pricing/server-job-meta";
import { expireFetchTasksForJob } from "@/lib/data/fetch-tasks";
import { refundFailedShards } from "@/lib/data/credits";
import type { JobBatch, BatchSummary, Job, BatchPricing } from "@/lib/types/jobs";

const CANCELLABLE_SHARD_STATUSES = new Set([
  "pending",
  "queued",
  "processing",
  "validating",
]);

async function resolveOrg(org?: SessionOrg): Promise<SessionOrg> {
  if (org) return org;
  const sessionOrg = await getSessionOrg();
  if (!sessionOrg) {
    throw new Error("No workspace found for this account.");
  }
  return sessionOrg;
}

async function getBatchesClient(org: SessionOrg) {
  if (!isAuthRequired()) {
    return { supabase: createAdminClient(), orgId: org.orgId };
  }
  return { supabase: await createClient(), orgId: org.orgId };
}

export async function getBatches(org?: SessionOrg): Promise<BatchSummary[]> {
  if (!isSupabaseConfigured() || !isPhase3Enabled()) return [];

  const workspace = await resolveOrg(org);
  const { supabase, orgId } = await getBatchesClient(workspace);

  const { data, error } = await supabase
    .from("job_batches")
    .select("id, organization_id, name, total_shards, completed_shards, failed_shards, status, batch_pricing, error_message, created_at, completed_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load batches: ${error.message}`);
  }

  return (data ?? []) as BatchSummary[];
}

export async function getBatch(
  id: string,
  org?: SessionOrg,
): Promise<{ batch: JobBatch; jobs: Job[] } | null> {
  if (!isSupabaseConfigured() || !isPhase3Enabled()) return null;

  const workspace = await resolveOrg(org);
  const { supabase, orgId } = await getBatchesClient(workspace);

  const { data: batchData, error: batchError } = await supabase
    .from("job_batches")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (batchError || !batchData) return null;

  const { data: jobsData, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .eq("parent_batch_id", id)
    .order("shard_index", { ascending: true });

  if (jobsError) {
    throw new Error(`Failed to load child jobs: ${jobsError.message}`);
  }

  const jobs = (jobsData ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    target_url: row.target_url,
    domain: row.domain,
    status: row.status,
    compliance_score: row.compliance_score ? Number(row.compliance_score) : null,
    record_count: row.record_count,
    created_at: row.created_at,
    completed_at: row.completed_at,
    example_schema: row.example_schema,
    error_message: row.error_message,
    attempt_count: row.attempt_count ?? 0,
    parent_batch_id: row.parent_batch_id,
    shard_index: row.shard_index,
    result_url: row.status === "completed" ? `/api/jobs/${row.id}/result` : null,
  })) as Job[];

  return { batch: batchData as JobBatch, jobs };
}

export type CreateBatchInput = {
  name: string;
  urls: string[];
  example_schema: Record<string, unknown>;
  organization_id?: string;
  budget_cents?: number;
  max_records?: number;
};

export type CreateBatchResult =
  | { success: true; batch: JobBatch }
  | { success: false; error: string };

export async function createBatch(
  input: CreateBatchInput,
  org?: SessionOrg,
): Promise<CreateBatchResult> {
  if (!isPhase3Enabled()) {
    return { success: false, error: "Phase 3 (batches) is not enabled." };
  }

  if (input.urls.length === 0) {
    return { success: false, error: "Must provide at least one URL." };
  }

  const workspace = await resolveOrg(org);
  const billing = await assertOrgBillingUnlocked(workspace.orgId);
  if (!billing.ok) {
    return { success: false, error: billing.error };
  }

  const emailGate = await assertOrgEmailVerifiedForJobs(workspace.orgId);
  if (!emailGate.ok) {
    return { success: false, error: emailGate.error };
  }

  const orgDomains = await getOrgDomainList(workspace.orgId);
  const workspaceScoped = orgDomains.length > 0;

  const validUrls: { url: string; domain: string }[] = [];
  
  for (const url of input.urls) {
    const sanitized = sanitizeJobInput({
      name: input.name,
      target_url: url,
      example_schema: input.example_schema,
    });
    
    if (!sanitized.ok) {
      return { success: false, error: `Validation failed for URL ${url}: ${sanitized.error}` };
    }
    
    if (!(await isUrlAllowedForOrg(sanitized.sanitized.target_url, workspace.orgId))) {
      return {
        success: false,
        error: `URL ${url} is not allowed. ${getWhitelistRejectionMessage(sanitized.sanitized.target_url, workspaceScoped)}`,
      };
    }
    
    const domain = extractDomain(sanitized.sanitized.target_url);
    if (!domain) {
       return { success: false, error: `Invalid URL format: ${url}` };
    }

    const executionGate = await assertDomainExecutionAllowed(domain);
    if (!executionGate.ok) {
      return { success: false, error: executionGate.error };
    }

    validUrls.push({ url: sanitized.sanitized.target_url, domain });
  }

  const uniqueDomains = [...new Set(validUrls.map((u) => u.domain))];
  for (const batchDomain of uniqueDomains) {
    const legalGate = await assertDomainLegalBasisForSchema(
      batchDomain,
      input.example_schema,
    );
    if (!legalGate.ok) {
      return { success: false, error: legalGate.error };
    }
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase configuration required for batches." };
  }

  const { supabase, orgId } = await getBatchesClient(workspace);
  const admin = createAdminClient();
  const pricingMode: BatchPricing = "per_batch";

  const serverMeta = await buildServerBatchSchema({
    schema: input.example_schema,
    domains: validUrls.map((u) => u.domain),
    maxRecords: input.max_records,
    budgetCents: input.budget_cents,
  });
  if ("error" in serverMeta) {
    return { success: false, error: serverMeta.error };
  }

  const chargePaise = serverMeta.chargePaise;

  if (isCreditsEnforced()) {
    const balance = await getCreditBalance(workspace);
    if (balance < chargePaise) {
      return {
        success: false,
        error: `Insufficient credits. This batch costs ₹${(chargePaise / 100).toFixed(0)}; balance ₹${(balance / 100).toFixed(0)}. Top up credits or reduce target volume.`,
      };
    }
  }

  const { data: batch, error: batchError } = await supabase
    .from("job_batches")
    .insert({
      organization_id: input.organization_id ?? orgId,
      name: input.name,
      total_shards: validUrls.length,
      example_schema: serverMeta.schema,
      batch_pricing: pricingMode,
    })
    .select("*")
    .single();

  if (batchError || !batch) {
    return { success: false, error: batchError?.message ?? "Failed to create batch" };
  }

  if (isCreditsEnforced()) {
    const charge = await chargeBatchCredits(
      orgId,
      batch.id,
      chargePaise,
      validUrls.length,
    );
    if (!charge.ok) {
      await admin.from("job_batches").delete().eq("id", batch.id);
      return { success: false, error: charge.error };
    }
  }

  const distributedBase =
    isPhase2Enabled() && process.env.PHASE2_DISTRIBUTED_FETCH !== "false";

  const createdJobIds: string[] = [];

  try {
    for (let i = 0; i < validUrls.length; i++) {
      const { url, domain } = validUrls[i];
      const jobTier = requiredTierForDomain(domain);
      const shardName = `${input.name} - Shard ${i + 1}`;
      const distributed = distributedBase;

      const { data: job, error: jobError } = await admin
        .from("jobs")
        .insert({
          organization_id: batch.organization_id,
          name: shardName,
          target_url: url,
          domain,
          example_schema: serverMeta.schema,
          status: "pending",
          requires_edge_fetch: distributed,
          compute_tier: jobTier,
          parent_batch_id: batch.id,
          shard_index: i,
        })
        .select("id")
        .single();

      if (jobError || !job) {
        throw new Error(jobError?.message ?? "Failed to create batch shard.");
      }

      createdJobIds.push(job.id);

      if (distributed) {
        await createFetchTaskForJob(
          job.id,
          url,
          domain,
          jobTier,
          undefined,
          serverMeta.schema,
        );
      }
    }
  } catch (err) {
    if (isCreditsEnforced()) {
      const { refundFailedShards } = await import("@/lib/data/credits");
      await refundFailedShards(orgId, batch.id, validUrls.length);
    }
    if (createdJobIds.length > 0) {
      await admin.from("fetch_tasks").delete().in("job_id", createdJobIds);
      await admin.from("jobs").delete().in("id", createdJobIds);
    }
    await admin.from("job_batches").delete().eq("id", batch.id);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create batch shards.",
    };
  }

  return { success: true, batch: batch as JobBatch };
}

export async function mergeBatchResults(batchId: string, org?: SessionOrg): Promise<Record<string, unknown>[]> {
  const batch = await getBatch(batchId, org);
  if (!batch) return [];
  
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_runs")
    .select("parsed_output")
    .in("job_id", batch.jobs.map(j => j.id))
    .eq("status", "completed");

  if (error || !data) return [];
  
  const merged: Record<string, unknown>[] = [];
  for (const run of data) {
    if (run.parsed_output) {
      if (Array.isArray(run.parsed_output)) {
        merged.push(...(run.parsed_output as Record<string, unknown>[]));
      } else {
        merged.push(run.parsed_output as Record<string, unknown>);
      }
    }
  }
  return merged;
}

export async function cancelBatch(batchId: string, org?: SessionOrg): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !isPhase3Enabled()) {
    return { success: false, error: "Not configured" };
  }

  const workspace = await resolveOrg(org);
  const { supabase, orgId } = await getBatchesClient(workspace);

  const { data: batch, error: batchFetchError } = await supabase
    .from("job_batches")
    .select("id, status")
    .eq("id", batchId)
    .eq("organization_id", orgId)
    .single();

  if (batchFetchError || !batch) {
    return { success: false, error: "Batch not found." };
  }

  if (!["pending", "queued", "processing"].includes(batch.status)) {
    return {
      success: false,
      error: "Only active batches that have not finished can be cancelled.",
    };
  }

  const admin = createAdminClient();
  const { data: childJobs } = await admin
    .from("jobs")
    .select("id, status")
    .eq("parent_batch_id", batchId)
    .eq("organization_id", orgId);

  const cancellableIds =
    childJobs
      ?.filter((j) => CANCELLABLE_SHARD_STATUSES.has(j.status))
      .map((j) => j.id) ?? [];

  for (const jobId of cancellableIds) {
    await expireFetchTasksForJob(jobId, "Batch cancelled by buyer");
  }

  const now = new Date().toISOString();

  if (cancellableIds.length > 0) {
    const { error } = await admin
      .from("jobs")
      .update({ status: "cancelled", completed_at: now })
      .in("id", cancellableIds);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  const { error: batchError } = await admin
    .from("job_batches")
    .update({ status: "cancelled", completed_at: now })
    .eq("id", batchId)
    .eq("organization_id", orgId)
    .in("status", ["pending", "queued", "processing"]);

  if (batchError) {
    return { success: false, error: batchError.message };
  }

  if (cancellableIds.length > 0) {
    await refundFailedShards(orgId, batchId, cancellableIds.length);
  }

  const { dispatchBatchCancelledEvent } = await import("@/lib/data/batch-events");
  await dispatchBatchCancelledEvent(batchId, orgId);

  return { success: true };
}
