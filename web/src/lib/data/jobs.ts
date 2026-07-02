import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSessionOrg, type SessionOrg } from "@/lib/auth/org";
import { DEFAULT_JOB_COST_CENTS, DEMO_ORG_ID, isAuthRequired, isPhase2Enabled, isSupabaseConfigured } from "@/lib/env";
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
} from "@/lib/data/credits";
import { sanitizeJobInput } from "@/lib/sanitize";
import { requiredTierForDomain } from "@/lib/contributor/fetch-tier";
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

  if (isCreditsEnforced()) {
    const balance = await getCreditBalance(workspace);
    if (balance < DEFAULT_JOB_COST_CENTS) {
      return {
        success: false,
        error: `Insufficient credits. Add funds on the Credits page (balance ₹${(balance / 100).toFixed(0)}).`,
      };
    }
  }

  const distributed =
    isPhase2Enabled() &&
    process.env.PHASE2_DISTRIBUTED_FETCH !== "false";

  const jobTier = requiredTierForDomain(domain);

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      organization_id: input.organization_id ?? orgId,
      name,
      target_url,
      domain,
      example_schema: input.example_schema,
      status: "pending",
      requires_edge_fetch: distributed,
      compute_tier: jobTier,
      required_region: input.required_region ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (distributed && data) {
    await createFetchTaskForJob(data.id, target_url, domain, jobTier, input.required_region);
  }

  if (isCreditsEnforced() && data) {
    const charge = await chargeJobCredits(orgId, data.id);
    if (!charge.ok) {
      await supabase.from("jobs").delete().eq("id", data.id);
      return { success: false, error: charge.error };
    }
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
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Job not found." };
  }

  if (job.status !== "failed") {
    return { success: false, error: "Only failed jobs can be retried." };
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "queued",
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
    .select("id, status")
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
