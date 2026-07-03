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
