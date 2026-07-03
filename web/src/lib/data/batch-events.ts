import { createAdminClient } from "@/lib/supabase/admin";
import { isPhase3Enabled, isSupabaseConfigured } from "@/lib/env";
import { dispatchBatchEvent } from "@/lib/data/webhook-subscriptions";

async function batchEventAlreadyDispatched(
  batchId: string,
  eventType: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("webhook_delivery_log")
    .select("id", { count: "exact", head: true })
    .eq("reference_id", batchId)
    .eq("event_type", eventType);

  return (count ?? 0) > 0;
}

/**
 * Fan out batch webhook subscription events after a child job status change.
 * Called from the job delivery pipeline and batch cancel flow.
 */
export async function maybeDispatchBatchWebhookEvents(
  jobId: string,
): Promise<void> {
  if (!isSupabaseConfigured() || !isPhase3Enabled()) return;

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select("id, status, parent_batch_id, organization_id")
    .eq("id", jobId)
    .single();

  if (!job?.parent_batch_id) return;

  const batchId = job.parent_batch_id as string;
  const orgId = job.organization_id as string;

  const { data: batch } = await admin
    .from("job_batches")
    .select("id, name, status, total_shards, completed_shards, failed_shards")
    .eq("id", batchId)
    .single();

  if (!batch) return;

  if (job.status === "failed") {
    await dispatchBatchEvent(orgId, batchId, "batch.shard_failed", {
      batchName: batch.name as string,
      totalShards: batch.total_shards as number,
      completedShards: batch.completed_shards as number,
      failedShards: batch.failed_shards as number,
    });
  }

  if (
    (batch.status === "completed" || batch.status === "failed") &&
    !(await batchEventAlreadyDispatched(batchId, "batch.completed"))
  ) {
    await dispatchBatchEvent(orgId, batchId, "batch.completed", {
      batchName: batch.name as string,
      totalShards: batch.total_shards as number,
      completedShards: batch.completed_shards as number,
      failedShards: batch.failed_shards as number,
    });
  }
}

export async function dispatchBatchCancelledEvent(
  batchId: string,
  orgId: string,
): Promise<void> {
  if (!isSupabaseConfigured() || !isPhase3Enabled()) return;

  const admin = createAdminClient();
  const { data: batch } = await admin
    .from("job_batches")
    .select("name, total_shards, completed_shards, failed_shards")
    .eq("id", batchId)
    .single();

  await dispatchBatchEvent(orgId, batchId, "batch.cancelled", {
    batchName: batch?.name as string | undefined,
    totalShards: batch?.total_shards as number | undefined,
    completedShards: batch?.completed_shards as number | undefined,
    failedShards: batch?.failed_shards as number | undefined,
  });
}
