import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, getPublicSiteUrl } from "@/lib/env";
import { signWebhookPayload } from "@/lib/data/delivery";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookSubscriptionEvent =
  | "job.completed"
  | "job.failed"
  | "batch.completed"
  | "batch.shard_failed"
  | "batch.cancelled"
  | "credit.low";

export type WebhookSubscription = {
  id: string;
  organization_id: string;
  url: string;
  secret: string | null;
  events: WebhookSubscriptionEvent[];
  enabled: boolean;
  description: string | null;
  last_triggered_at: string | null;
  last_status: number | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
};

export type WebhookDeliveryLog = {
  id: string;
  subscription_id: string;
  organization_id: string;
  event_type: string;
  reference_id: string | null;
  status: string;
  response_status: number | null;
  response_body: string | null;
  attempt_count: number;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type CreateWebhookSubscriptionInput = {
  url: string;
  secret?: string;
  events: WebhookSubscriptionEvent[];
  description?: string;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listWebhookSubscriptions(
  orgId: string,
): Promise<WebhookSubscription[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as WebhookSubscription[];
}

export async function createWebhookSubscription(
  orgId: string,
  input: CreateWebhookSubscriptionInput,
): Promise<WebhookSubscription> {
  if (!isSupabaseConfigured()) {
    return {
      id: crypto.randomUUID(),
      organization_id: orgId,
      url: input.url,
      secret: input.secret ?? null,
      events: input.events,
      enabled: true,
      description: input.description ?? null,
      last_triggered_at: null,
      last_status: null,
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_subscriptions")
    .insert({
      organization_id: orgId,
      url: input.url,
      secret: input.secret ?? null,
      events: input.events,
      enabled: true,
      description: input.description ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WebhookSubscription;
}

export async function updateWebhookSubscription(
  id: string,
  orgId: string,
  patch: Partial<Pick<WebhookSubscription, "url" | "events" | "enabled" | "description"> & { secret?: string }>,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("webhook_subscriptions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);
}

export async function deleteWebhookSubscription(
  id: string,
  orgId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("webhook_subscriptions")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);
}

// ─── Delivery log ─────────────────────────────────────────────────────────────

export async function listWebhookDeliveryLog(
  orgId: string,
  limit = 40,
): Promise<WebhookDeliveryLog[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_delivery_log")
    .select("id, subscription_id, organization_id, event_type, reference_id, status, response_status, response_body, attempt_count, last_error, delivered_at, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as WebhookDeliveryLog[];
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Fans out an event to all matching enabled subscriptions for the org.
 * Returns a summary of delivery outcomes.
 */
export async function dispatchSubscriptionEvent(
  orgId: string,
  eventType: WebhookSubscriptionEvent,
  referenceId: string,
  payload: Record<string, unknown>,
): Promise<{ dispatched: number; failed: number }> {
  if (!isSupabaseConfigured()) return { dispatched: 0, failed: 0 };

  const admin = createAdminClient();

  // Find all enabled subscriptions that include this event
  const { data: subs, error } = await admin
    .from("webhook_subscriptions")
    .select("id, url, secret, events")
    .eq("organization_id", orgId)
    .eq("enabled", true)
    .contains("events", [eventType]);

  if (error || !subs?.length) return { dispatched: 0, failed: 0 };

  let dispatched = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const body = JSON.stringify({
        event: eventType,
        reference_id: referenceId,
        organization_id: orgId,
        timestamp: new Date().toISOString(),
        ...payload,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Syftin-Webhook/2.0",
        "X-Syftin-Event": eventType,
        "X-Syftin-Delivery-Id": referenceId,
      };

      if (sub.secret) {
        headers["X-Syftin-Signature"] = signWebhookPayload(body, sub.secret as string);
      }

      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let lastError: string | null = null;

      try {
        const res = await fetch(sub.url as string, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(15_000),
        });
        responseStatus = res.status;
        responseBody = (await res.text()).slice(0, 500);
        if (!res.ok) lastError = `HTTP ${res.status}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Request failed";
      }

      const delivered = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

      // Log the delivery attempt
      await admin.from("webhook_delivery_log").insert({
        subscription_id: sub.id,
        organization_id: orgId,
        event_type: eventType,
        reference_id: referenceId,
        payload,
        status: delivered ? "delivered" : "failed",
        response_status: responseStatus,
        response_body: responseBody,
        attempt_count: 1,
        last_error: lastError,
        delivered_at: delivered ? new Date().toISOString() : null,
      });

      // Update subscription metadata
      const priorFailures = (sub as { failure_count?: number }).failure_count ?? 0;
      await admin.from("webhook_subscriptions").update({
        last_triggered_at: new Date().toISOString(),
        last_status: responseStatus,
        failure_count: delivered ? 0 : priorFailures + 1,
      }).eq("id", sub.id);

      if (delivered) dispatched++;
      else failed++;
    }),
  );

  return { dispatched, failed };
}

/**
 * Dispatch a batch-level event. Called from batch status-change triggers.
 */
export async function dispatchBatchEvent(
  orgId: string,
  batchId: string,
  eventType: "batch.completed" | "batch.shard_failed" | "batch.cancelled",
  meta: {
    batchName?: string;
    totalShards?: number;
    completedShards?: number;
    failedShards?: number;
  } = {},
): Promise<void> {
  await dispatchSubscriptionEvent(orgId, eventType, batchId, {
    batch_id: batchId,
    batch_name: meta.batchName ?? null,
    total_shards: meta.totalShards ?? null,
    completed_shards: meta.completedShards ?? null,
    failed_shards: meta.failedShards ?? null,
    download_url: `${getPublicSiteUrl()}/api/v2/batches/${batchId}/result`,
  }).catch(console.error);
}

/**
 * Dispatch a credit.low event when an org's credit balance drops below threshold.
 */
export async function dispatchCreditLowEvent(
  orgId: string,
  balancePaise: number,
  thresholdPaise: number,
): Promise<void> {
  await dispatchSubscriptionEvent(orgId, "credit.low", orgId, {
    balance_paise: balancePaise,
    balance_rupees: (balancePaise / 100).toFixed(2),
    threshold_paise: thresholdPaise,
    topup_url: `${getPublicSiteUrl()}/dashboard/credits`,
  }).catch(console.error);
}

/**
 * Retry failed subscription deliveries (called by cron).
 */
const MAX_SUBSCRIPTION_ATTEMPTS = 5;

export async function retryFailedSubscriptionDeliveries(limit = 20): Promise<{
  retried: number;
  delivered: number;
  failed: number;
}> {
  if (!isSupabaseConfigured()) return { retried: 0, delivered: 0, failed: 0 };

  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("webhook_delivery_log")
    .select("id, subscription_id, organization_id, event_type, reference_id, payload, attempt_count")
    .eq("status", "failed")
    .lt("attempt_count", MAX_SUBSCRIPTION_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) return { retried: 0, delivered: 0, failed: 0 };

  let delivered = 0;
  let failed = 0;

  for (const row of pending) {
    // Fetch subscription
    const { data: sub } = await admin
      .from("webhook_subscriptions")
      .select("url, secret, enabled")
      .eq("id", row.subscription_id)
      .single();

    if (!sub?.enabled) {
      await admin.from("webhook_delivery_log").update({ status: "skipped" }).eq("id", row.id);
      continue;
    }

    const body = JSON.stringify({
      ...(row.payload as Record<string, unknown> ?? {}),
      event: row.event_type,
      reference_id: row.reference_id,
      organization_id: row.organization_id,
      timestamp: new Date().toISOString(),
      retry_attempt: (row.attempt_count ?? 0) + 1,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Syftin-Webhook/2.0",
      "X-Syftin-Event": row.event_type,
    };
    if (sub.secret) headers["X-Syftin-Signature"] = signWebhookPayload(body, sub.secret as string);

    let responseStatus: number | null = null;
    let lastError: string | null = null;

    try {
      const res = await fetch(sub.url as string, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(15_000),
      });
      responseStatus = res.status;
      if (!res.ok) lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Request failed";
    }

    const ok = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

    await admin.from("webhook_delivery_log").update({
      status: ok ? "delivered" : "failed",
      response_status: responseStatus,
      attempt_count: (row.attempt_count ?? 0) + 1,
      last_error: lastError,
      delivered_at: ok ? new Date().toISOString() : null,
    }).eq("id", row.id);

    if (ok) delivered++;
    else failed++;
  }

  return { retried: pending.length, delivered, failed };
}
