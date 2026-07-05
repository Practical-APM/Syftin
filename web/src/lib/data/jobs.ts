import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSessionOrg, type SessionOrg } from "@/lib/auth/org";
import { DEMO_ORG_ID, isAuthRequired, isPhase2Enabled, isSupabaseConfigured } from "@/lib/env";
import { extractDomain, getWhitelistRejectionMessage } from "@/lib/constants/whitelist";
import {
  getOrgDomainList,
  isUrlAllowedForOrg,
} from "@/lib/data/org-domains";
import {
  addMockJob,
  advanceDemoJob,
  cancelMockJob,
  getMockJob,
  getMockJobResult,
  syncDemoJobs,
} from "@/lib/data/mock-store";
import {
  chargeJobCredits,
  createFetchTaskForJob,
  getCreditBalance,
  isCreditsEnforced,
  refundCancelledJob,
} from "@/lib/data/credits";
import { resetFetchTasksForJobRetry } from "@/lib/data/fetch-progress";
import { expireFetchTasksForJob } from "@/lib/data/fetch-tasks";
import { assertOrgBillingUnlocked } from "@/lib/data/billing-guards";
import { assertOrgEmailVerifiedForJobs } from "@/lib/data/org-gates";
import {
  getOrgSlaTier,
  getOrgExtractionTier,
  jobPriorityForSlaTier,
} from "@/lib/data/org-sla";
import { assertDomainExecutionAllowed } from "@/lib/data/domains";
import { assertDomainLegalBasisForSchema } from "@/lib/compliance/schema-sensitive";
import { sanitizeJobInput } from "@/lib/sanitize";
import { requiredTierForDomain } from "@/lib/contributor/fetch-tier";
import { buildServerJobSchema } from "@/lib/pricing/server-job-meta";
import type { Job, JobStatus } from "@/lib/types/jobs";

type DbJob = {
  id: string;
  organization_id: string;
  name: string;
  target_url: string;
  domain: string;
  example_schema: Record<string, unknown>;
  status: JobStatus;
  compliance_score: number | null;
  record_count: number | null;
  result_storage_path: string | null;
  error_message: string | null;
  attempt_count: number | null;
  parent_batch_id: string | null;
  shard_index: number | null;
  created_at: string;
  completed_at: string | null;
  required_region: string | null;
  variance_flags?: string[] | null;
};

function mapDbJob(row: DbJob): Job {
  return {
    id: row.id,
    name: row.name,
    target_url: row.target_url,
    domain: row.domain,
    status: row.status,
    compliance_score: row.compliance_score
      ? Number(row.compliance_score)
      : null,
    record_count: row.record_count,
    created_at: row.created_at,
    completed_at: row.completed_at,
    example_schema: row.example_schema,
    error_message: row.error_message,
    attempt_count: row.attempt_count ?? 0,
    parent_batch_id: row.parent_batch_id,
    shard_index: row.shard_index,
    required_region: row.required_region,
    variance_flags: Array.isArray(row.variance_flags)
      ? row.variance_flags
      : [],
    result_url:
      row.status === "completed"
        ? `/api/jobs/${row.id}/result`
        : null,
  };
}

async function resolveOrg(org?: SessionOrg): Promise<SessionOrg> {
  if (org) return org;
  const sessionOrg = await getSessionOrg();
  if (!sessionOrg) {
    throw new Error("No workspace found for this account.");
  }
  return sessionOrg;
}

async function getJobsClient(org: SessionOrg) {
  if (!isAuthRequired()) {
    return { supabase: createAdminClient(), orgId: org.orgId };
  }
  return { supabase: await createClient(), orgId: org.orgId };
}

export async function getJobs(org?: SessionOrg): Promise<Job[]> {
  if (!isSupabaseConfigured()) {
    return syncDemoJobs();
  }

  const workspace = await resolveOrg(org);
  const { supabase, orgId } = await getJobsClient(workspace);
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load jobs: ${error.message}`);
  }

  return (data ?? []).map((row) => mapDbJob(row as DbJob));
}

export async function getJob(id: string, org?: SessionOrg): Promise<Job | null> {
  if (!isSupabaseConfigured()) {
    const job = getMockJob(id);
    return job ? advanceDemoJob(job) : null;
  }

  const workspace = await resolveOrg(org);
  const { supabase, orgId } = await getJobsClient(workspace);
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbJob(data as DbJob);
}

export type CreateJobInput = {
  name: string;
  target_url: string;
  example_schema: Record<string, unknown>;
  organization_id?: string;
  required_region?: string;
  budget_cents?: number;
  max_records?: number;
  output_format?: "json" | "markdown" | "both";
};

export type CreateJobResult =
  | { success: true; job: Job }
  | { success: false; error: string };

export async function createJob(
  input: CreateJobInput,
  org?: SessionOrg,
): Promise<CreateJobResult> {
  const sanitized = sanitizeJobInput({
    name: input.name,
    target_url: input.target_url,
    example_schema: input.example_schema,
  });
  if (!sanitized.ok) {
    return { success: false, error: sanitized.error };
  }

  const { name, target_url } = sanitized.sanitized;

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

  if (!(await isUrlAllowedForOrg(target_url, workspace.orgId))) {
    return {
      success: false,
      error: getWhitelistRejectionMessage(target_url, workspaceScoped),
    };
  }

  const domain = extractDomain(target_url);
  if (!domain) {
    return { success: false, error: "Invalid URL format." };
  }

  const executionGate = await assertDomainExecutionAllowed(domain);
  if (!executionGate.ok) {
    return { success: false, error: executionGate.error };
  }

  const legalGate = await assertDomainLegalBasisForSchema(
    domain,
    input.example_schema,
  );
  if (!legalGate.ok) {
    return { success: false, error: legalGate.error };
  }

  if (!isSupabaseConfigured()) {
    const mockJob: Job = {
      id: `job_${Date.now()}`,
      name,
      target_url,
      domain,
      status: "queued",
      compliance_score: null,
      record_count: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      example_schema: input.example_schema,
      result_url: null,
      error_message: null,
      attempt_count: 0,
    };
    addMockJob(mockJob);
    return { success: true, job: mockJob };
  }

  const { supabase, orgId } = await getJobsClient(workspace);

  const serverMeta = await buildServerJobSchema({
    schema: input.example_schema,
    domain,
    targetUrl: target_url,
    maxRecords: input.max_records,
    budgetCents: input.budget_cents,
    extractionTier: await getOrgExtractionTier(input.organization_id ?? orgId),
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
        error: `Insufficient credits. This job costs ₹${(chargePaise / 100).toFixed(0)}; balance ₹${(balance / 100).toFixed(0)}. Top up credits or reduce target volume.`,
      };
    }
  }

  const distributed =
    isPhase2Enabled() &&
    process.env.PHASE2_DISTRIBUTED_FETCH !== "false";

  const jobTier = requiredTierForDomain(domain);
  const slaTier = await getOrgSlaTier(input.organization_id ?? orgId);
  const priority = jobPriorityForSlaTier(slaTier);

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      organization_id: input.organization_id ?? orgId,
      name,
      target_url,
      domain,
      example_schema: serverMeta.schema,
      status: "pending",
      requires_edge_fetch: distributed,
      compute_tier: jobTier,
      required_region: input.required_region ?? null,
      priority,
      output_format: input.output_format ?? "json",
    })
    .select("*")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (isCreditsEnforced() && data) {
    const charge = await chargeJobCredits(orgId, data.id, chargePaise);
    if (!charge.ok) {
      await supabase.from("jobs").delete().eq("id", data.id);
      return { success: false, error: charge.error };
    }
  }

  if (distributed && data) {
    await createFetchTaskForJob(
      data.id,
      target_url,
      domain,
      jobTier,
      input.required_region,
      serverMeta.schema,
    );
  }

  return { success: true, job: mapDbJob(data as DbJob) };
}

export async function retryJob(
  id: string,
  org?: SessionOrg,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Retry requires Supabase." };
  }

  const workspace = await resolveOrg(org);
  const { supabase, orgId } = await getJobsClient(workspace);
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select(
      "id, status, target_url, domain, compute_tier, required_region, requires_edge_fetch, example_schema",
    )
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Job not found." };
  }

  if (job.status !== "failed") {
    return { success: false, error: "Only failed jobs can be retried." };
  }

  const executionGate = await assertDomainExecutionAllowed(job.domain);
  if (!executionGate.ok) {
    return { success: false, error: executionGate.error };
  }

  if (job.requires_edge_fetch) {
    await resetFetchTasksForJobRetry(id);
    const admin = createAdminClient();
    const { count } = await admin
      .from("fetch_tasks")
      .select("*", { count: "exact", head: true })
      .eq("job_id", id);
    if (!count) {
      await createFetchTaskForJob(
        id,
        job.target_url,
        job.domain,
        job.compute_tier ?? undefined,
        job.required_region ?? undefined,
        job.example_schema as Record<string, unknown> | undefined,
      );
    }
  }

  const nextStatus = job.requires_edge_fetch ? "pending" : "queued";

  const { error } = await supabase
    .from("jobs")
    .update({
      status: nextStatus,
      error_message: null,
      completed_at: null,
      compliance_score: null,
      record_count: null,
    })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

const CANCELLABLE = new Set([
  "pending",
  "queued",
  "processing",
  "validating",
]);

export async function cancelJob(
  id: string,
  org?: SessionOrg,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    const cancelled = cancelMockJob(id);
    if (!cancelled) {
      return {
        success: false,
        error: "Only active jobs that have not finished can be cancelled.",
      };
    }
    return { success: true };
  }

  const workspace = await resolveOrg(org);
  const { supabase, orgId } = await getJobsClient(workspace);
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("id, status, record_count, example_schema")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Job not found." };
  }

  if (!CANCELLABLE.has(job.status)) {
    return {
      success: false,
      error: "Only active jobs that have not finished can be cancelled.",
    };
  }

  await expireFetchTasksForJob(id, "Job cancelled by buyer");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "cancelled",
      completed_at: now,
      error_message: null,
    })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  await refundCancelledJob(orgId, id, {
    recordCount: job.record_count,
    exampleSchema: job.example_schema as Record<string, unknown>,
  });

  return { success: true };
}

export async function getJobResult(
  id: string,
  org?: SessionOrg,
): Promise<Record<string, unknown>[] | null> {
  if (!isSupabaseConfigured()) {
    syncDemoJobs();
    return getMockJobResult(id);
  }

  const job = await getJob(id, org);
  if (!job || job.status !== "completed") {
    return null;
  }

  const { supabase } = await getJobsClient(await resolveOrg(org));
  const { data, error } = await supabase
    .from("job_runs")
    .select("parsed_output")
    .eq("job_id", id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.parsed_output) {
    return null;
  }

  const output = data.parsed_output;
  return Array.isArray(output) ? output : [output as Record<string, unknown>];
}
