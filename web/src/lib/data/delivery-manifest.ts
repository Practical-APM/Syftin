import { createAdminClient } from "@/lib/supabase/admin";
import { getJobFetchProgress } from "@/lib/data/fetch-progress";
import type { Job } from "@/lib/types/jobs";

export type DeliveryManifest = {
  job_id: string;
  domain: string;
  target_url: string;
  status: string;
  generated_at: string;
  record_count: number | null;
  compliance_score: number | null;
  variance_flags: string[];
  effective_max_records: number | null;
  fetch_progress: {
    total: number;
    completed: number;
    failed: number;
    hub_fallback: number;
  } | null;
  consensus: {
    groups_total: number;
    verified: number;
    disputed: number;
    pending_hub_check: number;
  };
  hub_spot_check: {
    truth_flags: string[];
  };
};

export async function buildDeliveryManifest(job: Job): Promise<DeliveryManifest> {
  const syftin = job.example_schema?._syftin;
  const effectiveMax =
    syftin &&
    typeof syftin === "object" &&
    !Array.isArray(syftin)
      ? Number((syftin as Record<string, unknown>).effective_max_records) || null
      : null;

  const truthFlags = (job.variance_flags ?? []).filter((f) =>
    f.startsWith("truth_"),
  );

  let fetchProgress: DeliveryManifest["fetch_progress"] = null;
  const consensus = {
    groups_total: 0,
    verified: 0,
    disputed: 0,
    pending_hub_check: 0,
  };

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = createAdminClient();
    const progress = await getJobFetchProgress(job.id);
    if (progress && progress.total > 0) {
      fetchProgress = {
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        hub_fallback: progress.failed,
      };
    }

    const { data: tasks } = await admin
      .from("fetch_tasks")
      .select("consensus_group_id, consensus_status")
      .eq("job_id", job.id)
      .not("consensus_group_id", "is", null);

    const seen = new Set<string>();
    for (const row of tasks ?? []) {
      const groupId = row.consensus_group_id as string;
      if (seen.has(groupId)) continue;
      seen.add(groupId);
      consensus.groups_total++;
      const status = row.consensus_status as string | null;
      if (status === "verified") consensus.verified++;
      else if (status === "disputed") consensus.disputed++;
      else if (status === "pending_hub_check") consensus.pending_hub_check++;
    }
  }

  return {
    job_id: job.id,
    domain: job.domain,
    target_url: job.target_url,
    status: job.status,
    generated_at: new Date().toISOString(),
    record_count: job.record_count,
    compliance_score: job.compliance_score,
    variance_flags: job.variance_flags ?? [],
    effective_max_records: effectiveMax,
    fetch_progress: fetchProgress,
    consensus,
    hub_spot_check: { truth_flags: truthFlags },
  };
}
