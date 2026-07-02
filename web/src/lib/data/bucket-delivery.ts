import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GoogleAuth } from "google-auth-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getJobResult } from "@/lib/data/jobs";
import { serializeJobResult } from "@/lib/export/serialize-result";
import type { ExportFormat } from "@/lib/export/formats";
import {
  decryptField,
  encryptField,
  getFieldCipherSecret,
} from "@/lib/security/field-cipher";

export type BucketProvider = "s3" | "gcs";

export type BucketDeliveryConfig = {
  enabled: boolean;
  provider: BucketProvider | null;
  bucketName: string | null;
  region: string | null;
  prefix: string;
  endpoint: string | null;
  gcsProjectId: string | null;
  hasS3Credentials: boolean;
  hasGcsCredentials: boolean;
};

type S3Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

type GcsCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim() || "syftin/";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function parseBucketConfigFromRow(row: Record<string, unknown>): BucketDeliveryConfig {
  return {
    enabled: Boolean(row.bucket_push_enabled),
    provider: (row.bucket_provider as BucketProvider | null) ?? null,
    bucketName: (row.bucket_name as string | null) ?? null,
    region: (row.bucket_region as string | null) ?? null,
    prefix: normalizePrefix((row.bucket_prefix as string | null) ?? "syftin/"),
    endpoint: (row.bucket_endpoint as string | null) ?? null,
    gcsProjectId: (row.gcs_project_id as string | null) ?? null,
    hasS3Credentials: Boolean(row.bucket_access_key_enc && row.bucket_secret_key_enc),
    hasGcsCredentials: Boolean(row.gcs_credentials_enc),
  };
}

export async function getBucketDeliveryConfig(orgId: string): Promise<BucketDeliveryConfig> {
  if (!isSupabaseConfigured()) {
    return {
      enabled: false,
      provider: null,
      bucketName: null,
      region: null,
      prefix: "syftin/",
      endpoint: null,
      gcsProjectId: null,
      hasS3Credentials: false,
      hasGcsCredentials: false,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      "bucket_push_enabled, bucket_provider, bucket_name, bucket_region, bucket_prefix, bucket_endpoint, bucket_access_key_enc, bucket_secret_key_enc, gcs_project_id, gcs_credentials_enc",
    )
    .eq("id", orgId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Organization not found");
  }

  return parseBucketConfigFromRow(data);
}

export async function updateBucketDeliveryConfig(
  orgId: string,
  input: {
    enabled?: boolean;
    provider?: BucketProvider | null;
    bucketName?: string | null;
    region?: string | null;
    prefix?: string;
    endpoint?: string | null;
    gcsProjectId?: string | null;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    gcsServiceAccountJson?: string;
  },
): Promise<BucketDeliveryConfig> {
  const cipherSecret = getFieldCipherSecret();
  if (!isSupabaseConfigured()) {
    return getBucketDeliveryConfig(orgId);
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.enabled !== undefined) patch.bucket_push_enabled = input.enabled;
  if (input.provider !== undefined) patch.bucket_provider = input.provider;
  if (input.bucketName !== undefined) patch.bucket_name = input.bucketName;
  if (input.region !== undefined) patch.bucket_region = input.region;
  if (input.prefix !== undefined) patch.bucket_prefix = normalizePrefix(input.prefix);
  if (input.endpoint !== undefined) patch.bucket_endpoint = input.endpoint;
  if (input.gcsProjectId !== undefined) patch.gcs_project_id = input.gcsProjectId;

  if (input.s3AccessKeyId !== undefined || input.s3SecretAccessKey !== undefined) {
    if (!cipherSecret) {
      throw new Error("INTERNAL_DELIVERY_SECRET is required to store bucket credentials.");
    }
    if (input.s3AccessKeyId) {
      patch.bucket_access_key_enc = encryptField(input.s3AccessKeyId, cipherSecret);
    }
    if (input.s3SecretAccessKey) {
      patch.bucket_secret_key_enc = encryptField(input.s3SecretAccessKey, cipherSecret);
    }
  }

  if (input.gcsServiceAccountJson !== undefined) {
    if (!cipherSecret) {
      throw new Error("INTERNAL_DELIVERY_SECRET is required to store bucket credentials.");
    }
    const parsed = JSON.parse(input.gcsServiceAccountJson) as GcsCredentials;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("GCS service account JSON must include client_email and private_key.");
    }
    patch.gcs_credentials_enc = encryptField(input.gcsServiceAccountJson, cipherSecret);
    if (!input.gcsProjectId && parsed.project_id) {
      patch.gcs_project_id = parsed.project_id;
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(patch).eq("id", orgId);
  if (error) throw new Error(error.message);

  return getBucketDeliveryConfig(orgId);
}

async function loadS3Credentials(orgId: string): Promise<S3Credentials | null> {
  const cipherSecret = getFieldCipherSecret();
  if (!cipherSecret) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("bucket_access_key_enc, bucket_secret_key_enc")
    .eq("id", orgId)
    .single();

  if (!data?.bucket_access_key_enc || !data?.bucket_secret_key_enc) return null;

  return {
    accessKeyId: decryptField(data.bucket_access_key_enc, cipherSecret),
    secretAccessKey: decryptField(data.bucket_secret_key_enc, cipherSecret),
  };
}

async function loadGcsCredentials(orgId: string): Promise<GcsCredentials | null> {
  const cipherSecret = getFieldCipherSecret();
  if (!cipherSecret) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("gcs_credentials_enc")
    .eq("id", orgId)
    .single();

  if (!data?.gcs_credentials_enc) return null;

  return JSON.parse(decryptField(data.gcs_credentials_enc, cipherSecret)) as GcsCredentials;
}

function buildObjectKey(prefix: string, orgId: string, jobId: string, filename: string): string {
  return `${prefix}${orgId}/${jobId}/${filename}`;
}

async function uploadToS3(
  config: BucketDeliveryConfig,
  credentials: S3Credentials,
  key: string,
  body: string,
  contentType: string,
): Promise<void> {
  const client = new S3Client({
    region: config.region ?? "us-east-1",
    endpoint: config.endpoint ?? undefined,
    forcePathStyle: Boolean(config.endpoint),
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName!,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        source: "syftin",
      },
    }),
  );
}

async function uploadToGcs(
  config: BucketDeliveryConfig,
  credentials: GcsCredentials,
  key: string,
  body: string,
  contentType: string,
): Promise<void> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/devstorage.read_write"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error("Could not obtain GCS access token");
  }

  const encodedKey = encodeURIComponent(key).replace(/%2F/g, "/");
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${config.bucketName}/o?uploadType=media&name=${encodedKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": contentType,
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GCS upload failed: HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`);
  }
}

async function getOrgDefaultExportFormat(orgId: string): Promise<ExportFormat> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("default_export_format")
    .eq("id", orgId)
    .single();
  const fmt = data?.default_export_format;
  return fmt === "csv" || fmt === "ndjson" ? fmt : "json";
}

function bucketConfigReady(config: BucketDeliveryConfig): boolean {
  if (!config.enabled || !config.bucketName || !config.provider) return false;
  if (config.provider === "s3") {
    return config.hasS3Credentials && Boolean(config.region);
  }
  return config.hasGcsCredentials;
}

export async function uploadOrgBucketObject(
  orgId: string,
  objectKey: string,
  body: string,
  contentType = "application/x-ndjson",
): Promise<void> {
  const config = await getBucketDeliveryConfig(orgId);
  if (!bucketConfigReady(config)) {
    throw new Error("Bucket push is not configured for this workspace.");
  }
  if (config.provider === "s3") {
    const credentials = await loadS3Credentials(orgId);
    if (!credentials) throw new Error("S3 credentials not configured.");
    await uploadToS3(config, credentials, objectKey, body, contentType);
    return;
  }
  const credentials = await loadGcsCredentials(orgId);
  if (!credentials) throw new Error("GCS credentials not configured.");
  await uploadToGcs(config, credentials, objectKey, body, contentType);
}

export async function deliverJobToBucket(
  jobId: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string; objectKey?: string }> {
  if (!isSupabaseConfigured()) return { ok: true, skipped: true };

  const admin = createAdminClient();
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("id, organization_id, status, name")
    .eq("id", jobId)
    .single();

  if (jobError || !job || job.status !== "completed") {
    return { ok: false, error: "Job not found or not completed." };
  }

  const bucketConfig = await getBucketDeliveryConfig(job.organization_id);

  if (!bucketConfigReady(bucketConfig)) {
    await markBucketDeliverySkipped(admin, jobId, job.organization_id);
    return { ok: true, skipped: true };
  }

  const rows = await getJobResult(jobId, {
    orgId: job.organization_id,
    orgName: "",
    dpaSignedAt: null,
    role: "api",
  });
  if (!rows?.length) {
    return { ok: false, error: "Job result not found." };
  }

  const exportFormat = await getOrgDefaultExportFormat(job.organization_id);
  const { body, contentType, filename } = serializeJobResult(
    rows,
    jobId,
    exportFormat,
  );
  const objectKey = buildObjectKey(
    bucketConfig.prefix,
    job.organization_id,
    jobId,
    filename,
  );

  let lastError: string | null = null;
  try {
    if (bucketConfig.provider === "s3") {
      const credentials = await loadS3Credentials(job.organization_id);
      if (!credentials) throw new Error("S3 credentials not configured.");
      await uploadToS3(bucketConfig, credentials, objectKey, body, contentType);
    } else {
      const credentials = await loadGcsCredentials(job.organization_id);
      if (!credentials) throw new Error("GCS credentials not configured.");
      await uploadToGcs(bucketConfig, credentials, objectKey, body, contentType);
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Bucket upload failed";
  }

  const delivered = !lastError;
  const { data: logRow } = await admin
    .from("job_delivery_log")
    .select("attempt_count")
    .eq("job_id", jobId)
    .eq("channel", "bucket")
    .eq("event_type", "job.completed")
    .maybeSingle();

  await admin
    .from("job_delivery_log")
    .upsert(
      {
        job_id: jobId,
        organization_id: job.organization_id,
        channel: "bucket",
        event_type: "job.completed",
        status: delivered ? "delivered" : "failed",
        attempt_count: (logRow?.attempt_count ?? 0) + 1,
        last_error: lastError,
        response_status: delivered ? 200 : null,
        delivered_at: delivered ? new Date().toISOString() : null,
      },
      { onConflict: "job_id,channel,event_type" },
    );

  return delivered
    ? { ok: true, objectKey }
    : { ok: false, error: lastError ?? "Bucket delivery failed" };
}

async function markBucketDeliverySkipped(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  orgId: string,
) {
  await admin
    .from("job_delivery_log")
    .upsert(
      {
        job_id: jobId,
        organization_id: orgId,
        channel: "bucket",
        event_type: "job.completed",
        status: "skipped",
        delivered_at: new Date().toISOString(),
      },
      { onConflict: "job_id,channel,event_type" },
    );
}

export async function sendTestBucketUpload(
  orgId: string,
): Promise<{ ok: boolean; error?: string; objectKey?: string }> {
  const config = await getBucketDeliveryConfig(orgId);
  if (!bucketConfigReady(config)) {
    return { ok: false, error: "Configure and enable bucket push first." };
  }

  const testId = `test-${Date.now()}`;
  const body = JSON.stringify({
    event: "ping",
    message: "Syftin bucket test — your configuration works.",
    organization_id: orgId,
    timestamp: new Date().toISOString(),
  });
  const objectKey = buildObjectKey(config.prefix, orgId, testId, "syftin-test.json");

  try {
    if (config.provider === "s3") {
      const credentials = await loadS3Credentials(orgId);
      if (!credentials) throw new Error("S3 credentials not configured.");
      await uploadToS3(config, credentials, objectKey, body, "application/json");
    } else {
      const credentials = await loadGcsCredentials(orgId);
      if (!credentials) throw new Error("GCS credentials not configured.");
      await uploadToGcs(config, credentials, objectKey, body, "application/json");
    }
    return { ok: true, objectKey };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Bucket test failed",
    };
  }
}