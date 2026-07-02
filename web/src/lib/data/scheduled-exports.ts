import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getJobResult } from "@/lib/data/jobs";
import { uploadOrgBucketObject } from "@/lib/data/bucket-delivery";
import { getBucketDeliveryConfig } from "@/lib/data/bucket-delivery";
import { getSftpDeliveryConfig, uploadOrgSftpObject } from "@/lib/data/sftp-delivery";
import { jsonRowsToNdjson } from "@/lib/export/ndjson";

export type ExportScheduleFrequency = "daily" | "weekly";
export type ExportScheduleChannel = "bucket" | "sftp";

export type ExportScheduleConfig = {
  enabled: boolean;
  frequency: ExportScheduleFrequency | null;
  channel: ExportScheduleChannel | null;
  lastRunAt: string | null;
};

function parseScheduleRow(row: Record<string, unknown>): ExportScheduleConfig {
  return {
    enabled: Boolean(row.export_schedule_enabled),
    frequency: (row.export_schedule_frequency as ExportScheduleFrequency | null) ?? null,
    channel: (row.export_schedule_channel as ExportScheduleChannel | null) ?? null,
    lastRunAt: (row.export_schedule_last_run_at as string | null) ?? null,
  };
}

export async function getExportScheduleConfig(orgId: string): Promise<ExportScheduleConfig> {
  if (!isSupabaseConfigured()) {
    return { enabled: false, frequency: null, channel: null, lastRunAt: null };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      "export_schedule_enabled, export_schedule_frequency, export_schedule_channel, export_schedule_last_run_at",
    )
    .eq("id", orgId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Organization not found");
  return parseScheduleRow(data);
}

export async function updateExportScheduleConfig(
  orgId: string,
  input: {
    enabled?: boolean;
    frequency?: ExportScheduleFrequency | null;
    channel?: ExportScheduleChannel | null;
  },
): Promise<ExportScheduleConfig> {
  if (!isSupabaseConfigured()) return getExportScheduleConfig(orgId);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.enabled !== undefined) patch.export_schedule_enabled = input.enabled;
  if (input.frequency !== undefined) patch.export_schedule_frequency = input.frequency;
  if (input.channel !== undefined) patch.export_schedule_channel = input.channel;

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(patch).eq("id", orgId);
  if (error) throw new Error(error.message);
  return getExportScheduleConfig(orgId);
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcWeek(d = new Date()): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  return startOfUtcDay(monday);
}

function isScheduleDue(config: ExportScheduleConfig, now = new Date()): boolean {
  if (!config.enabled || !config.frequency || !config.channel) return false;
  if (!config.lastRunAt) return true;
  const last = new Date(config.lastRunAt);
  if (config.frequency === "daily") {
    return last < startOfUtcDay(now);
  }
  return last < startOfUtcWeek(now);
}

function batchObjectPath(
  prefix: string,
  orgId: string,
  dateLabel: string,
  channel: ExportScheduleChannel,
): string {
  const filename = `syftin-batch-${dateLabel}.ndjson`;
  if (channel === "bucket") {
    const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return `${base}batches/${orgId}/${filename}`;
  }
  return `/syftin/batches/${orgId}/${filename}`;
}

function scheduleChannelReady(
  channel: ExportScheduleChannel,
  bucket: Awaited<ReturnType<typeof getBucketDeliveryConfig>>,
  sftp: Awaited<ReturnType<typeof getSftpDeliveryConfig>>,
): boolean {
  if (channel === "bucket") {
    if (!bucket.enabled || !bucket.bucketName || !bucket.provider) return false;
    if (bucket.provider === "s3") {
      return bucket.hasS3Credentials && Boolean(bucket.region);
    }
    return bucket.hasGcsCredentials;
  }
  return sftp.enabled && Boolean(sftp.host) && (sftp.hasPassword || sftp.hasPrivateKey);
}

type BatchLine = {
  job_id: string;
  organization_id: string;
  name: string;
  domain: string;
  completed_at: string | null;
  record: Record<string, unknown>;
};

export async function runScheduledExportsForOrg(
  orgId: string,
): Promise<{ ok: boolean; skipped?: boolean; jobCount?: number; path?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: true, skipped: true };

  const [schedule, bucket, sftp] = await Promise.all([
    getExportScheduleConfig(orgId),
    getBucketDeliveryConfig(orgId),
    getSftpDeliveryConfig(orgId),
  ]);

  if (!isScheduleDue(schedule)) {
    return { ok: true, skipped: true };
  }
  if (!schedule.channel || !scheduleChannelReady(schedule.channel, bucket, sftp)) {
    await logBatchResult(orgId, "skipped", 0, null, "Delivery channel not configured.");
    return { ok: true, skipped: true };
  }

  const since = schedule.lastRunAt ?? new Date(0).toISOString();
  const admin = createAdminClient();
  const { data: jobs, error } = await admin
    .from("jobs")
    .select("id, name, domain, completed_at")
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .gt("completed_at", since)
    .order("completed_at", { ascending: true });

  if (error) {
    await logBatchResult(orgId, "failed", 0, null, error.message);
    return { ok: false, error: error.message };
  }

  if (!jobs?.length) {
    await admin
      .from("organizations")
      .update({
        export_schedule_last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);
    await logBatchResult(orgId, "skipped", 0, null, "No new completed jobs.");
    return { ok: true, skipped: true, jobCount: 0 };
  }

  const lines: BatchLine[] = [];
  for (const job of jobs) {
    const rows = await getJobResult(job.id, {
      orgId,
      orgName: "",
      dpaSignedAt: null,
      role: "api",
    });
    if (!rows?.length) continue;
    for (const record of rows) {
      lines.push({
        job_id: job.id,
        organization_id: orgId,
        name: job.name,
        domain: job.domain,
        completed_at: job.completed_at,
        record,
      });
    }
  }

  const dateLabel = new Date().toISOString().slice(0, 10);
  const body = jsonRowsToNdjson(lines);
  const path =
    schedule.channel === "bucket"
      ? batchObjectPath(bucket.prefix, orgId, dateLabel, "bucket")
      : batchObjectPath(sftp.remotePath, orgId, dateLabel, "sftp");

  let lastError: string | null = null;
  try {
    if (schedule.channel === "bucket") {
      await uploadOrgBucketObject(orgId, path, body);
    } else {
      await uploadOrgSftpObject(orgId, path, body);
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Batch upload failed";
  }

  const delivered = !lastError;
  await logBatchResult(
    orgId,
    delivered ? "delivered" : "failed",
    jobs.length,
    path,
    lastError,
  );

  if (delivered) {
    await admin
      .from("organizations")
      .update({
        export_schedule_last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);
  }

  return delivered
    ? { ok: true, jobCount: jobs.length, path }
    : { ok: false, error: lastError ?? "Batch export failed" };
}

async function logBatchResult(
  orgId: string,
  status: "delivered" | "failed" | "skipped",
  jobCount: number,
  objectPath: string | null,
  lastError: string | null,
) {
  if (!isSupabaseConfigured()) return;
  const admin = createAdminClient();
  await admin.from("export_batch_log").insert({
    organization_id: orgId,
    status,
    job_count: jobCount,
    object_path: objectPath,
    last_error: lastError,
  });
}

export async function runAllScheduledExports(): Promise<{
  orgsChecked: number;
  exported: number;
  skipped: number;
  failed: number;
}> {
  if (!isSupabaseConfigured()) {
    return { orgsChecked: 0, exported: 0, skipped: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id")
    .eq("export_schedule_enabled", true);

  if (error) throw new Error(error.message);

  let exported = 0;
  let skipped = 0;
  let failed = 0;

  for (const org of orgs ?? []) {
    const result = await runScheduledExportsForOrg(org.id);
    if (result.skipped) skipped++;
    else if (result.ok) exported++;
    else failed++;
  }

  return {
    orgsChecked: orgs?.length ?? 0,
    exported,
    skipped,
    failed,
  };
}
