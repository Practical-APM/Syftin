import { createAdminClient } from "@/lib/supabase/admin";

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }
  if (value && typeof value === "object") {
    return [value as Record<string, unknown>];
  }
  return [];
}

/** Merge progressive page records into an in-flight job_run row. */
export async function mergeIncrementalJobOutput(
  jobId: string,
  records: unknown[],
): Promise<void> {
  if (!records.length) return;

  const admin = createAdminClient();
  const incoming = asRecordArray(records);
  if (!incoming.length) return;

  const { data: existing } = await admin
    .from("job_runs")
    .select("id, parsed_output")
    .eq("job_id", jobId)
    .eq("status", "processing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const merged = [
    ...asRecordArray(existing?.parsed_output),
    ...incoming,
  ];

  const now = new Date().toISOString();

  if (existing?.id) {
    await admin
      .from("job_runs")
      .update({
        parsed_output: merged,
        finished_at: now,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("job_runs").insert({
      job_id: jobId,
      worker_id: "hub-progressive",
      status: "processing",
      started_at: now,
      finished_at: now,
      parsed_output: merged,
    });
  }

  await admin
    .from("jobs")
    .update({ record_count: merged.length })
    .eq("id", jobId)
    .in("status", ["pending", "queued", "processing", "validating"]);
}

/** Mark stale progressive partial runs before the final completed job_run. */
export async function supersedeProcessingJobRuns(jobId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("job_runs")
    .update({ status: "failed", finished_at: now })
    .eq("job_id", jobId)
    .eq("status", "processing");
}
