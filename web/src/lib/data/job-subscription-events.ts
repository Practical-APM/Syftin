import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import {
  buildFailedWebhookPayload,
  buildWebhookPayload,
  getOrgDeliveryConfig,
} from "@/lib/data/delivery";
import {
  dispatchSubscriptionEvent,
  type WebhookSubscriptionEvent,
} from "@/lib/data/webhook-subscriptions";

/**
 * Fan out job.completed / job.failed to per-event webhook subscriptions.
 * Runs alongside the legacy single-URL org webhook in deliverWebhook().
 */
export async function dispatchJobSubscriptionEvents(
  jobId: string,
  eventType: "job.completed" | "job.failed",
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createAdminClient();
  const expectedStatus = eventType === "job.failed" ? "failed" : "completed";
  const { data: job } = await admin
    .from("jobs")
    .select(
      "id, organization_id, name, domain, target_url, status, record_count, compliance_score, completed_at, error_message",
    )
    .eq("id", jobId)
    .single();

  if (!job || job.status !== expectedStatus) return;

  const orgId = job.organization_id as string;
  const config = await getOrgDeliveryConfig(orgId);

  const payload =
    eventType === "job.failed"
      ? await buildFailedWebhookPayload(job, orgId)
      : await buildWebhookPayload(job, orgId, config.webhookIncludeData);

  await dispatchSubscriptionEvent(
    orgId,
    eventType as WebhookSubscriptionEvent,
    jobId,
    payload as unknown as Record<string, unknown>,
  ).catch(console.error);
}

const PARTIAL_FLAGS = new Set([
  "volume_capped",
  "job_terminated_exhausted",
  "partial_fetch",
  "partial_pages_missing",
]);

/** Notify buyers when a job delivered partial data (budget cap, exhaustion, etc.) */
export async function maybeDispatchJobPartialEvent(
  jobId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select(
      "id, organization_id, name, domain, target_url, status, record_count, variance_flags, completed_at",
    )
    .eq("id", jobId)
    .single();

  if (!job || job.status !== "completed") return;

  const flags = (job.variance_flags as string[] | null) ?? [];
  const isPartial = flags.some((f) => {
    if (PARTIAL_FLAGS.has(f)) return true;
    return f.startsWith("partial_pages_missing_");
  });
  if (!isPartial) return;

  const payload = {
    event: "job.partial",
    job_id: job.id,
    name: job.name,
    domain: job.domain,
    target_url: job.target_url,
    record_count: job.record_count,
    variance_flags: flags,
    completed_at: job.completed_at,
    message:
      "Job completed with partial data — review variance flags for details.",
  };

  await dispatchSubscriptionEvent(
    job.organization_id as string,
    "job.partial",
    jobId,
    payload,
  ).catch(console.error);
}
