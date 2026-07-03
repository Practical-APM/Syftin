import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

const WINDOW_MS = 60_000;
const MIN_DISTINCT_NODES = 5;
const FAILURE_RATE_THRESHOLD = 0.15;

export type DomainValidationInput = {
  domain: string;
  nodeId?: string | null;
  jobId?: string | null;
  passed: boolean;
  complianceScore?: number | null;
};

export async function recordDomainValidationEvent(
  input: DomainValidationInput,
): Promise<{ suspended: boolean; reason?: string }> {
  if (!isSupabaseConfigured()) return { suspended: false };

  const admin = createAdminClient();
  const domain = input.domain.trim().toLowerCase();

  await admin.from("domain_validation_events").insert({
    domain,
    node_id: input.nodeId ?? null,
    job_id: input.jobId ?? null,
    passed: input.passed,
    compliance_score: input.complianceScore ?? null,
  });

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data: events, error } = await admin
    .from("domain_validation_events")
    .select("node_id, passed")
    .eq("domain", domain)
    .gte("created_at", since);

  if (error || !events?.length) return { suspended: false };

  const distinctNodes = new Set(
    events.map((e) => e.node_id).filter((id): id is string => Boolean(id)),
  );
  if (distinctNodes.size < MIN_DISTINCT_NODES) {
    return { suspended: false };
  }

  const failures = events.filter((e) => !e.passed).length;
  const failureRate = failures / events.length;

  if (failureRate <= FAILURE_RATE_THRESHOLD) {
    return { suspended: false };
  }

  const reason = "TARGET_DRIFT_SUSPENDED";
  await admin
    .from("whitelist_domains")
    .update({
      execution_suspended: true,
      suspension_reason: reason,
    })
    .eq("domain", domain);

  console.warn(
    `[domain-circuit-breaker] suspended ${domain}: ${(failureRate * 100).toFixed(1)}% failure across ${distinctNodes.size} nodes`,
  );

  return { suspended: true, reason };
}

/** Resolve node id from completed fetch tasks for a job (hub fallback). */
export async function primaryNodeForJob(
  jobId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("fetch_tasks")
    .select("claimed_by_node_id")
    .eq("job_id", jobId)
    .eq("status", "completed")
    .not("claimed_by_node_id", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.claimed_by_node_id as string | null) ?? null;
}
