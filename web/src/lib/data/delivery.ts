import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSiteUrl, isSupabaseConfigured } from "@/lib/env";
import {
  apiKeyPrefix,
  generateApiKey,
  hashApiKey,
  setMockApiKey,
} from "@/lib/auth/api-key";
import type { SessionOrg } from "@/lib/auth/org";
import { getJob, getJobResult } from "@/lib/data/jobs";
import type { ExportFormat } from "@/lib/export/formats";
import type { Job } from "@/lib/types/jobs";
import { deliverJobToBucket } from "@/lib/data/bucket-delivery";
import { deliverJobToSftp } from "@/lib/data/sftp-delivery";
import { deliverJobToWarehouse } from "@/lib/data/warehouse-delivery";

export type WebhookEventType = "job.completed" | "job.failed";

export type OrgDeliveryConfig = {
  webhookUrl: string | null;
  webhookEnabled: boolean;
  webhookNotifyFailed: boolean;
  webhookIncludeData: boolean;
  hasWebhookSecret: boolean;
  apiKeyPrefix: string | null;
  apiKeyScope: string;
  apiKeyLastUsedAt: string | null;
  apiKeyUsageCount: number;
  defaultExportFormat: ExportFormat;
};

declare global {
  var __syftinMockDelivery: OrgDeliveryConfig | undefined;
}

function mockConfig(): OrgDeliveryConfig {
  if (!global.__syftinMockDelivery) {
    global.__syftinMockDelivery = {
      webhookUrl: null,
      webhookEnabled: false,
      webhookNotifyFailed: false,
      webhookIncludeData: false,
      hasWebhookSecret: false,
      apiKeyPrefix: null,
      apiKeyScope: "read_write",
      apiKeyLastUsedAt: null,
      apiKeyUsageCount: 0,
      defaultExportFormat: "json",
    };
  }
  return global.__syftinMockDelivery;
}

export async function getOrgDeliveryConfig(
  orgId: string,
): Promise<OrgDeliveryConfig> {
  if (!isSupabaseConfigured()) {
    return mockConfig();
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      "webhook_url, webhook_enabled, webhook_notify_failed, webhook_include_data, webhook_secret, api_key_prefix, api_key_scope, api_key_last_used_at, api_key_usage_count, default_export_format",
    )
    .eq("id", orgId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Organization not found");
  }

  return {
    webhookUrl: data.webhook_url,
    webhookEnabled: Boolean(data.webhook_enabled),
    webhookNotifyFailed: Boolean(data.webhook_notify_failed),
    webhookIncludeData: Boolean(data.webhook_include_data),
    hasWebhookSecret: Boolean(data.webhook_secret),
    apiKeyPrefix: data.api_key_prefix,
    apiKeyScope: data.api_key_scope ?? "read_write",
    apiKeyLastUsedAt: data.api_key_last_used_at,
    apiKeyUsageCount: Number(data.api_key_usage_count ?? 0),
    defaultExportFormat: (data.default_export_format ?? "json") as ExportFormat,
  };
}

export async function updateOrgDeliveryConfig(
  orgId: string,
  input: {
    webhookUrl?: string | null;
    webhookEnabled?: boolean;
    webhookNotifyFailed?: boolean;
    webhookIncludeData?: boolean;
    webhookSecret?: string | null;
    defaultExportFormat?: ExportFormat;
  },
): Promise<OrgDeliveryConfig> {
  if (!isSupabaseConfigured()) {
    const cfg = mockConfig();
    if (input.webhookUrl !== undefined) cfg.webhookUrl = input.webhookUrl;
    if (input.webhookEnabled !== undefined) cfg.webhookEnabled = input.webhookEnabled;
    if (input.webhookNotifyFailed !== undefined) {
      cfg.webhookNotifyFailed = input.webhookNotifyFailed;
    }
    if (input.webhookIncludeData !== undefined) {
      cfg.webhookIncludeData = input.webhookIncludeData;
    }
    if (input.webhookSecret !== undefined) {
      cfg.hasWebhookSecret = Boolean(input.webhookSecret);
    }
    if (input.defaultExportFormat) cfg.defaultExportFormat = input.defaultExportFormat;
    global.__syftinMockDelivery = cfg;
    return cfg;
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.webhookUrl !== undefined) patch.webhook_url = input.webhookUrl;
  if (input.webhookEnabled !== undefined) patch.webhook_enabled = input.webhookEnabled;
  if (input.webhookNotifyFailed !== undefined) {
    patch.webhook_notify_failed = input.webhookNotifyFailed;
  }
  if (input.webhookIncludeData !== undefined) {
    patch.webhook_include_data = input.webhookIncludeData;
  }
  if (input.webhookSecret !== undefined) patch.webhook_secret = input.webhookSecret;
  if (input.defaultExportFormat) patch.default_export_format = input.defaultExportFormat;

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(patch).eq("id", orgId);
  if (error) throw new Error(error.message);
  return getOrgDeliveryConfig(orgId);
}

export async function rotateOrgApiKey(
  orgId: string,
  scope: string = "read_write",
): Promise<{ apiKey: string; prefix: string; scope: string }> {
  const apiKey = generateApiKey();
  const prefix = apiKeyPrefix(apiKey);
  const hash = hashApiKey(apiKey);

  if (!isSupabaseConfigured()) {
    setMockApiKey(apiKey, orgId);
    const cfg = mockConfig();
    cfg.apiKeyPrefix = prefix;
    cfg.apiKeyScope = scope;
    cfg.apiKeyUsageCount = 0;
    cfg.apiKeyLastUsedAt = null;
    global.__syftinMockDelivery = cfg;
    return { apiKey, prefix, scope };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      api_key_hash: hash,
      api_key_prefix: prefix,
      api_key_scope: scope,
      api_key_usage_count: 0,
      api_key_last_used_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) throw new Error(error.message);
  return { apiKey, prefix, scope };
}

export async function revokeOrgApiKey(orgId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    global.__syftinMockApiKeyHash = undefined;
    const cfg = mockConfig();
    cfg.apiKeyPrefix = null;
    global.__syftinMockDelivery = cfg;
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      api_key_hash: null,
      api_key_prefix: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);
  if (error) throw new Error(error.message);
}

export function buildDownloadUrls(jobId: string, siteUrl = getPublicSiteUrl()) {
  const base = `${siteUrl}/api/v1/jobs/${jobId}/result`;
  return {
    json: base,
    csv: `${base}?format=csv`,
    ndjson: `${base}?format=ndjson`,
  };
}

export type WebhookFailedPayload = {
  event: "job.failed";
  job_id: string;
  organization_id: string;
  name: string;
  domain: string;
  target_url: string;
  error_message: string | null;
  failed_at: string | null;
};

export type WebhookPayload = {
  event: "job.completed";
  job_id: string;
  organization_id: string;
  name: string;
  domain: string;
  target_url: string;
  record_count: number | null;
  compliance_score: number | null;
  completed_at: string | null;
  download_urls: ReturnType<typeof buildDownloadUrls>;
  data?: Record<string, unknown>[];
};

export function signWebhookPayload(
  body: string,
  secret: string,
): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = signWebhookPayload(body, secret);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

const MAX_INLINE_ROWS = 500;
const MAX_INLINE_BYTES = 100_000;

export type WebhookJobFields = Pick<
  Job,
  | "id"
  | "name"
  | "domain"
  | "target_url"
  | "record_count"
  | "compliance_score"
  | "completed_at"
>;

export async function buildWebhookPayload(
  job: WebhookJobFields,
  orgId: string,
  includeData: boolean,
): Promise<WebhookPayload> {
  const payload: WebhookPayload = {
    event: "job.completed",
    job_id: job.id,
    organization_id: orgId,
    name: job.name,
    domain: job.domain,
    target_url: job.target_url,
    record_count: job.record_count,
    compliance_score: job.compliance_score,
    completed_at: job.completed_at,
    download_urls: buildDownloadUrls(job.id),
  };

  if (includeData) {
    const rows = await getJobResult(job.id, { orgId, orgName: "", dpaSignedAt: null, role: "owner" });
    if (rows) {
      const serialized = JSON.stringify(rows);
      if (
        rows.length <= MAX_INLINE_ROWS &&
        Buffer.byteLength(serialized, "utf8") <= MAX_INLINE_BYTES
      ) {
        payload.data = rows;
      }
    }
  }

  return payload;
}

export async function buildFailedWebhookPayload(
  job: WebhookJobFields & { error_message?: string | null },
  orgId: string,
): Promise<WebhookFailedPayload> {
  return {
    event: "job.failed",
    job_id: job.id,
    organization_id: orgId,
    name: job.name,
    domain: job.domain,
    target_url: job.target_url,
    error_message: job.error_message ?? null,
    failed_at: job.completed_at,
  };
}

export async function deliverWebhook(
  jobId: string,
  eventType: WebhookEventType = "job.completed",
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true, skipped: true };

  const admin = createAdminClient();
  const expectedStatus = eventType === "job.failed" ? "failed" : "completed";
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select(
      "id, organization_id, name, domain, target_url, status, record_count, compliance_score, completed_at, error_message",
    )
    .eq("id", jobId)
    .single();

  if (jobError || !job || job.status !== expectedStatus) {
    return { ok: false, error: `Job not found or not ${expectedStatus}.` };
  }

  const config = await getOrgDeliveryConfig(job.organization_id);
  if (!config.webhookUrl) {
    await markDeliverySkipped(admin, jobId, job.organization_id, eventType);
    return { ok: true, skipped: true };
  }

  if (eventType === "job.completed") {
    if (!config.webhookEnabled) {
      await markDeliverySkipped(admin, jobId, job.organization_id, eventType);
      return { ok: true, skipped: true };
    }
  } else if (!config.webhookEnabled || !config.webhookNotifyFailed) {
    await markDeliverySkipped(admin, jobId, job.organization_id, eventType);
    return { ok: true, skipped: true };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("webhook_secret")
    .eq("id", job.organization_id)
    .single();

  const secret = org?.webhook_secret as string | null;
  const body =
    eventType === "job.failed"
      ? JSON.stringify(await buildFailedWebhookPayload(job, job.organization_id))
      : JSON.stringify(
          await buildWebhookPayload(
            job,
            job.organization_id,
            config.webhookIncludeData,
          ),
        );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Syftin-Webhook/1.0",
    "X-Syftin-Event": eventType,
    "X-Syftin-Delivery-Id": jobId,
  };
  if (secret) {
    headers["X-Syftin-Signature"] = signWebhookPayload(body, secret);
  }

  let responseStatus: number | null = null;
  let lastError: string | null = null;

  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });
    responseStatus = res.status;
    if (!res.ok) {
      lastError = `HTTP ${res.status}`;
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Webhook request failed";
  }

  const delivered = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;
  const { data: logRow } = await admin
    .from("job_delivery_log")
    .select("attempt_count")
    .eq("job_id", jobId)
    .eq("channel", "webhook")
    .eq("event_type", eventType)
    .maybeSingle();

  await admin
    .from("job_delivery_log")
    .upsert(
      {
        job_id: jobId,
        organization_id: job.organization_id,
        channel: "webhook",
        event_type: eventType,
        status: delivered ? "delivered" : "failed",
        attempt_count: (logRow?.attempt_count ?? 0) + 1,
        last_error: lastError,
        response_status: responseStatus,
        delivered_at: delivered ? new Date().toISOString() : null,
      },
      { onConflict: "job_id,channel,event_type" },
    );

  return delivered
    ? { ok: true }
    : { ok: false, error: lastError ?? "Webhook delivery failed" };
}

async function markDeliverySkipped(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  orgId: string,
  eventType: WebhookEventType,
) {
  await admin
    .from("job_delivery_log")
    .upsert(
      {
        job_id: jobId,
        organization_id: orgId,
        channel: "webhook",
        event_type: eventType,
        status: "skipped",
        delivered_at: new Date().toISOString(),
      },
      { onConflict: "job_id,channel,event_type" },
    );
}

export async function deliverJobWebhook(
  jobId: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  return deliverWebhook(jobId, "job.completed");
}

export async function deliverJob(
  jobId: string,
  eventType: WebhookEventType = "job.completed",
): Promise<{
  webhook: { ok: boolean; skipped?: boolean; error?: string };
  bucket: { ok: boolean; skipped?: boolean; error?: string; objectKey?: string };
  sftp: { ok: boolean; skipped?: boolean; error?: string; remotePath?: string };
  warehouse: { ok: boolean; skipped?: boolean; error?: string; rowCount?: number };
}> {
  const [webhook, bucket, sftp, warehouse] = await Promise.all([
    deliverWebhook(jobId, eventType),
    eventType === "job.completed"
      ? deliverJobToBucket(jobId)
      : Promise.resolve({ ok: true, skipped: true }),
    eventType === "job.completed"
      ? deliverJobToSftp(jobId)
      : Promise.resolve({ ok: true, skipped: true }),
    eventType === "job.completed"
      ? deliverJobToWarehouse(jobId)
      : Promise.resolve({ ok: true, skipped: true }),
  ]);

  // Phase 4: per-event webhook subscriptions + batch lifecycle events
  const { dispatchJobSubscriptionEvents } = await import(
    "@/lib/data/job-subscription-events"
  );
  const { maybeDispatchBatchWebhookEvents } = await import(
    "@/lib/data/batch-events"
  );
  await Promise.all([
    dispatchJobSubscriptionEvents(jobId, eventType),
    maybeDispatchBatchWebhookEvents(jobId),
  ]);

  return { webhook, bucket, sftp, warehouse };
}

const MAX_WEBHOOK_ATTEMPTS = 5;

export async function processPendingJobDeliveries(limit = 20): Promise<{
  processed: number;
  delivered: number;
  failed: number;
  skipped: number;
  retried: number;
}> {
  if (!isSupabaseConfigured()) {
    return { processed: 0, delivered: 0, failed: 0, skipped: 0, retried: 0 };
  }

  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("job_delivery_log")
    .select("job_id, channel, status, attempt_count, event_type")
    .in("channel", ["webhook", "bucket", "sftp", "warehouse"])
    .in("status", ["pending", "failed"])
    .lt("attempt_count", MAX_WEBHOOK_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  let delivered = 0;
  let failed = 0;
  let skipped = 0;
  let retried = 0;

  for (const row of pending ?? []) {
    if (row.status === "failed") retried++;
    const eventType = (row.event_type ?? "job.completed") as WebhookEventType;
    const result =
      row.channel === "bucket"
        ? await deliverJobToBucket(row.job_id)
        : row.channel === "sftp"
          ? await deliverJobToSftp(row.job_id)
          : row.channel === "warehouse"
            ? await deliverJobToWarehouse(row.job_id)
            : await deliverWebhook(row.job_id, eventType);
    if (result.skipped) skipped++;
    else if (result.ok) delivered++;
    else failed++;
  }

  return {
    processed: pending?.length ?? 0,
    delivered,
    failed,
    skipped,
    retried,
  };
}

export async function listRecentDeliveryLog(
  orgId: string,
  limit = 20,
): Promise<
  Array<{
    id: string;
    job_id: string;
    channel: string;
    event_type: string;
    status: string;
    attempt_count: number;
    last_error: string | null;
    delivered_at: string | null;
    created_at: string;
  }>
> {
  if (!isSupabaseConfigured()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_delivery_log")
    .select("id, job_id, channel, event_type, status, attempt_count, last_error, delivered_at, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function sendTestWebhook(orgId: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getOrgDeliveryConfig(orgId);
  if (!config.webhookUrl) {
    return { ok: false, error: "Set a webhook URL first." };
  }

  const site = getPublicSiteUrl();
  const payload = {
    event: "ping",
    message: "Syftin webhook test — your endpoint is configured correctly.",
    organization_id: orgId,
    timestamp: new Date().toISOString(),
    sample_download_urls: buildDownloadUrls("00000000-0000-4000-8000-000000000000", site),
  };
  const body = JSON.stringify(payload);

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("webhook_secret")
    .eq("id", orgId)
    .maybeSingle();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Syftin-Webhook/1.0",
    "X-Syftin-Event": "ping",
  };
  const secret = org?.webhook_secret as string | null;
  if (secret) headers["X-Syftin-Signature"] = signWebhookPayload(body, secret);

  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Endpoint returned HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}

export type SessionOrgLike = Pick<SessionOrg, "orgId" | "orgName" | "dpaSignedAt" | "role">;
