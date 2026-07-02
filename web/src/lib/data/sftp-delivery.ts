import SftpClient from "ssh2-sftp-client";
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

export type SftpAuthMethod = "password" | "private_key";

export type SftpDeliveryConfig = {
  enabled: boolean;
  host: string | null;
  port: number;
  username: string | null;
  authMethod: SftpAuthMethod | null;
  remotePath: string;
  hasPassword: boolean;
  hasPrivateKey: boolean;
};

function normalizeRemotePath(path: string): string {
  const trimmed = path.trim() || "/syftin";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "") || "/syftin";
}

export function parseSftpConfigFromRow(row: Record<string, unknown>): SftpDeliveryConfig {
  return {
    enabled: Boolean(row.sftp_push_enabled),
    host: (row.sftp_host as string | null) ?? null,
    port: typeof row.sftp_port === "number" ? row.sftp_port : 22,
    username: (row.sftp_username as string | null) ?? null,
    authMethod: (row.sftp_auth_method as SftpAuthMethod | null) ?? null,
    remotePath: normalizeRemotePath((row.sftp_remote_path as string | null) ?? "/syftin"),
    hasPassword: Boolean(row.sftp_password_enc),
    hasPrivateKey: Boolean(row.sftp_private_key_enc),
  };
}

export async function getSftpDeliveryConfig(orgId: string): Promise<SftpDeliveryConfig> {
  if (!isSupabaseConfigured()) {
    return {
      enabled: false,
      host: null,
      port: 22,
      username: null,
      authMethod: null,
      remotePath: "/syftin",
      hasPassword: false,
      hasPrivateKey: false,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      "sftp_push_enabled, sftp_host, sftp_port, sftp_username, sftp_auth_method, sftp_remote_path, sftp_password_enc, sftp_private_key_enc",
    )
    .eq("id", orgId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Organization not found");
  }

  return parseSftpConfigFromRow(data);
}

export async function updateSftpDeliveryConfig(
  orgId: string,
  input: {
    enabled?: boolean;
    host?: string | null;
    port?: number;
    username?: string | null;
    authMethod?: SftpAuthMethod | null;
    remotePath?: string;
    password?: string;
    privateKey?: string;
  },
): Promise<SftpDeliveryConfig> {
  if (!isSupabaseConfigured()) {
    return getSftpDeliveryConfig(orgId);
  }

  const cipherSecret = getFieldCipherSecret();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.enabled !== undefined) patch.sftp_push_enabled = input.enabled;
  if (input.host !== undefined) patch.sftp_host = input.host;
  if (input.port !== undefined) patch.sftp_port = input.port;
  if (input.username !== undefined) patch.sftp_username = input.username;
  if (input.authMethod !== undefined) patch.sftp_auth_method = input.authMethod;
  if (input.remotePath !== undefined) patch.sftp_remote_path = normalizeRemotePath(input.remotePath);

  if (input.password !== undefined) {
    if (!cipherSecret) {
      throw new Error("INTERNAL_DELIVERY_SECRET is required to store SFTP credentials.");
    }
    if (input.password) {
      patch.sftp_password_enc = encryptField(input.password, cipherSecret);
      patch.sftp_auth_method = "password";
    }
  }

  if (input.privateKey !== undefined) {
    if (!cipherSecret) {
      throw new Error("INTERNAL_DELIVERY_SECRET is required to store SFTP credentials.");
    }
    if (input.privateKey) {
      patch.sftp_private_key_enc = encryptField(input.privateKey, cipherSecret);
      patch.sftp_auth_method = "private_key";
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(patch).eq("id", orgId);
  if (error) throw new Error(error.message);

  return getSftpDeliveryConfig(orgId);
}

type SftpConnectOptions = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
};

async function loadSftpConnectOptions(orgId: string): Promise<SftpConnectOptions | null> {
  const cipherSecret = getFieldCipherSecret();
  if (!cipherSecret) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select(
      "sftp_host, sftp_port, sftp_username, sftp_auth_method, sftp_password_enc, sftp_private_key_enc",
    )
    .eq("id", orgId)
    .single();

  if (!data?.sftp_host || !data?.sftp_username) return null;

  const options: SftpConnectOptions = {
    host: data.sftp_host,
    port: data.sftp_port ?? 22,
    username: data.sftp_username,
  };

  if (data.sftp_auth_method === "private_key" && data.sftp_private_key_enc) {
    options.privateKey = decryptField(data.sftp_private_key_enc, cipherSecret);
  } else if (data.sftp_password_enc) {
    options.password = decryptField(data.sftp_password_enc, cipherSecret);
  } else {
    return null;
  }

  return options;
}

function buildRemoteFilePath(
  remotePath: string,
  orgId: string,
  jobId: string,
  filename: string,
): string {
  return `${remotePath}/${orgId}/${jobId}/${filename}`;
}

function parentDir(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  return idx > 0 ? filePath.slice(0, idx) : "/";
}

async function uploadViaSftp(
  connect: SftpConnectOptions,
  remoteFilePath: string,
  body: string,
): Promise<void> {
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: connect.host,
      port: connect.port,
      username: connect.username,
      password: connect.password,
      privateKey: connect.privateKey,
      readyTimeout: 20_000,
    });
    await sftp.mkdir(parentDir(remoteFilePath), true);
    await sftp.put(Buffer.from(body, "utf8"), remoteFilePath);
  } finally {
    await sftp.end().catch(() => undefined);
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

function sftpConfigReady(config: SftpDeliveryConfig): boolean {
  if (!config.enabled || !config.host || !config.username) return false;
  if (config.authMethod === "private_key") return config.hasPrivateKey;
  return config.hasPassword;
}

export async function uploadOrgSftpObject(
  orgId: string,
  remoteFilePath: string,
  body: string,
): Promise<void> {
  const config = await getSftpDeliveryConfig(orgId);
  if (!sftpConfigReady(config)) {
    throw new Error("SFTP is not configured for this workspace.");
  }
  const connect = await loadSftpConnectOptions(orgId);
  if (!connect) throw new Error("SFTP credentials not configured.");
  await uploadViaSftp(connect, remoteFilePath, body);
}

export async function deliverJobToSftp(
  jobId: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string; remotePath?: string }> {
  if (!isSupabaseConfigured()) return { ok: true, skipped: true };

  const admin = createAdminClient();
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("id, organization_id, status")
    .eq("id", jobId)
    .single();

  if (jobError || !job || job.status !== "completed") {
    return { ok: false, error: "Job not found or not completed." };
  }

  const sftpConfig = await getSftpDeliveryConfig(job.organization_id);
  if (!sftpConfigReady(sftpConfig)) {
    await markSftpDeliverySkipped(admin, jobId, job.organization_id);
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
  const { body, filename } = serializeJobResult(rows, jobId, exportFormat);
  const remoteFilePath = buildRemoteFilePath(
    sftpConfig.remotePath,
    job.organization_id,
    jobId,
    filename,
  );

  let lastError: string | null = null;
  try {
    const connect = await loadSftpConnectOptions(job.organization_id);
    if (!connect) throw new Error("SFTP credentials not configured.");
    await uploadViaSftp(connect, remoteFilePath, body);
  } catch (err) {
    lastError = err instanceof Error ? err.message : "SFTP upload failed";
  }

  const delivered = !lastError;
  const { data: logRow } = await admin
    .from("job_delivery_log")
    .select("attempt_count")
    .eq("job_id", jobId)
    .eq("channel", "sftp")
    .eq("event_type", "job.completed")
    .maybeSingle();

  await admin
    .from("job_delivery_log")
    .upsert(
      {
        job_id: jobId,
        organization_id: job.organization_id,
        channel: "sftp",
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
    ? { ok: true, remotePath: remoteFilePath }
    : { ok: false, error: lastError ?? "SFTP delivery failed" };
}

async function markSftpDeliverySkipped(
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
        channel: "sftp",
        event_type: "job.completed",
        status: "skipped",
        delivered_at: new Date().toISOString(),
      },
      { onConflict: "job_id,channel,event_type" },
    );
}

export async function sendTestSftpUpload(
  orgId: string,
): Promise<{ ok: boolean; error?: string; remotePath?: string }> {
  const config = await getSftpDeliveryConfig(orgId);
  if (!sftpConfigReady(config)) {
    return { ok: false, error: "Configure and enable SFTP push first." };
  }

  const testId = `test-${Date.now()}`;
  const body = JSON.stringify({
    event: "ping",
    message: "Syftin SFTP test — your configuration works.",
    organization_id: orgId,
    timestamp: new Date().toISOString(),
  });
  const remoteFilePath = buildRemoteFilePath(config.remotePath, orgId, testId, "syftin-test.json");

  try {
    const connect = await loadSftpConnectOptions(orgId);
    if (!connect) throw new Error("SFTP credentials not configured.");
    await uploadViaSftp(connect, remoteFilePath, body);
    return { ok: true, remotePath: remoteFilePath };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SFTP test failed",
    };
  }
}
