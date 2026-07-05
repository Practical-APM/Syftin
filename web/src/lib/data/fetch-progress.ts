import { createAdminClient } from "@/lib/supabase/admin";
import { isPhase2Enabled, isSupabaseConfigured } from "@/lib/env";

export type FetchTaskProgress = {
  pageIndex: number;
  status: string;
  targetUrl: string;
};

export type JobFetchProgress = {
  total: number;
  completed: number;
  pending: number;
  claimed: number;
  failed: number;
  expired: number;
  recordsExtracted: number;
  tasks: FetchTaskProgress[];
};

export function readDistributedPagination(
  schema: Record<string, unknown> | undefined,
): boolean {
  const raw = schema?._syftin;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return Boolean((raw as Record<string, unknown>).distributed_pagination);
}

export async function getJobFetchProgress(
  jobId: string,
): Promise<JobFetchProgress | null> {
  if (!isPhase2Enabled() || !isSupabaseConfigured()) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fetch_tasks")
    .select("page_index, status, target_url")
    .eq("job_id", jobId)
    .order("page_index", { ascending: true });

  if (error || !data?.length) return null;

  const tasks: FetchTaskProgress[] = data.map((row) => ({
    pageIndex: row.page_index ?? 0,
    status: row.status,
    targetUrl: row.target_url,
  }));

  let completed = 0;
  let pending = 0;
  let claimed = 0;
  let failed = 0;
  let expired = 0;
  for (const t of tasks) {
    if (t.status === "completed") completed++;
    else if (t.status === "pending") pending++;
    else if (t.status === "claimed") claimed++;
    else if (t.status === "failed") failed++;
    else if (t.status === "expired") expired++;
  }

  const { data: pageRows } = await admin
    .from("job_page_results")
    .select("record_count")
    .eq("job_id", jobId);

  const recordsExtracted = (pageRows ?? []).reduce(
    (sum, row) => sum + Number(row.record_count ?? 0),
    0,
  );

  return {
    total: tasks.length,
    completed,
    pending,
    claimed,
    failed,
    expired,
    recordsExtracted,
    tasks,
  };
}

/** Reset fetch tasks when retrying a failed edge-fetch job. */
export async function resetFetchTasksForJobRetry(jobId: string): Promise<void> {
  if (!isPhase2Enabled() || !isSupabaseConfigured()) return;

  const admin = createAdminClient();

  await admin.from("fetch_tasks").delete().eq("job_id", jobId).gt("page_index", 0);

  await admin
    .from("fetch_tasks")
    .update({
      status: "pending",
      html_payload: null,
      html_byte_size: null,
      claimed_by_node_id: null,
      claimed_at: null,
      completed_at: null,
      error_message: null,
    })
    .eq("job_id", jobId)
    .eq("page_index", 0);
}
