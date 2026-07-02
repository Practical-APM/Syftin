import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import {
  getOrgDeliveryConfig,
  listRecentDeliveryLog,
  revokeOrgApiKey,
  rotateOrgApiKey,
  updateOrgDeliveryConfig,
} from "@/lib/data/delivery";
import {
  getBucketDeliveryConfig,
  updateBucketDeliveryConfig,
  type BucketProvider,
} from "@/lib/data/bucket-delivery";
import {
  getSftpDeliveryConfig,
  updateSftpDeliveryConfig,
  type SftpAuthMethod,
} from "@/lib/data/sftp-delivery";
import {
  getExportScheduleConfig,
  updateExportScheduleConfig,
  type ExportScheduleChannel,
  type ExportScheduleFrequency,
} from "@/lib/data/scheduled-exports";
import {
  getWarehouseDeliveryConfig,
  updateWarehouseDeliveryConfig,
  type WarehouseProvider,
} from "@/lib/data/warehouse-delivery";
import type { ExportFormat } from "@/lib/export/formats";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const [config, bucket, sftp, schedule, warehouse, log] = await Promise.all([
      getOrgDeliveryConfig(auth.org.orgId),
      getBucketDeliveryConfig(auth.org.orgId),
      getSftpDeliveryConfig(auth.org.orgId),
      getExportScheduleConfig(auth.org.orgId),
      getWarehouseDeliveryConfig(auth.org.orgId),
      listRecentDeliveryLog(auth.org.orgId, 10),
    ]);
    return NextResponse.json({ config, bucket, sftp, schedule, warehouse, recentDeliveries: log });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load delivery settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const [config, bucket, sftp, schedule, warehouse] = await Promise.all([
      updateOrgDeliveryConfig(auth.org.orgId, {
        webhookUrl:
          typeof body.webhookUrl === "string" ? body.webhookUrl.trim() || null : body.webhookUrl,
        webhookEnabled: Boolean(body.webhookEnabled),
        webhookNotifyFailed: Boolean(body.webhookNotifyFailed),
        webhookIncludeData: Boolean(body.webhookIncludeData),
        webhookSecret:
          typeof body.webhookSecret === "string"
            ? body.webhookSecret.trim() || null
            : undefined,
        defaultExportFormat: ["json", "csv", "ndjson"].includes(body.defaultExportFormat)
          ? (body.defaultExportFormat as ExportFormat)
          : undefined,
      }),
      updateBucketDeliveryConfig(auth.org.orgId, {
        enabled: body.bucketEnabled !== undefined ? Boolean(body.bucketEnabled) : undefined,
        provider:
          body.bucketProvider === "s3" || body.bucketProvider === "gcs"
            ? (body.bucketProvider as BucketProvider)
            : body.bucketProvider === null
              ? null
              : undefined,
        bucketName:
          typeof body.bucketName === "string" ? body.bucketName.trim() || null : body.bucketName,
        region:
          typeof body.bucketRegion === "string" ? body.bucketRegion.trim() || null : body.bucketRegion,
        prefix: typeof body.bucketPrefix === "string" ? body.bucketPrefix : undefined,
        endpoint:
          typeof body.bucketEndpoint === "string"
            ? body.bucketEndpoint.trim() || null
            : body.bucketEndpoint,
        gcsProjectId:
          typeof body.gcsProjectId === "string"
            ? body.gcsProjectId.trim() || null
            : body.gcsProjectId,
        s3AccessKeyId:
          typeof body.s3AccessKeyId === "string" ? body.s3AccessKeyId.trim() : undefined,
        s3SecretAccessKey:
          typeof body.s3SecretAccessKey === "string" ? body.s3SecretAccessKey.trim() : undefined,
        gcsServiceAccountJson:
          typeof body.gcsServiceAccountJson === "string"
            ? body.gcsServiceAccountJson.trim()
            : undefined,
      }),
      updateSftpDeliveryConfig(auth.org.orgId, {
        enabled: body.sftpEnabled !== undefined ? Boolean(body.sftpEnabled) : undefined,
        host: typeof body.sftpHost === "string" ? body.sftpHost.trim() || null : body.sftpHost,
        port: typeof body.sftpPort === "number" ? body.sftpPort : undefined,
        username:
          typeof body.sftpUsername === "string" ? body.sftpUsername.trim() || null : body.sftpUsername,
        authMethod:
          body.sftpAuthMethod === "password" || body.sftpAuthMethod === "private_key"
            ? (body.sftpAuthMethod as SftpAuthMethod)
            : body.sftpAuthMethod === null
              ? null
              : undefined,
        remotePath: typeof body.sftpRemotePath === "string" ? body.sftpRemotePath : undefined,
        password: typeof body.sftpPassword === "string" ? body.sftpPassword : undefined,
        privateKey: typeof body.sftpPrivateKey === "string" ? body.sftpPrivateKey : undefined,
      }),
      updateExportScheduleConfig(auth.org.orgId, {
        enabled:
          body.exportScheduleEnabled !== undefined
            ? Boolean(body.exportScheduleEnabled)
            : undefined,
        frequency:
          body.exportScheduleFrequency === "daily" || body.exportScheduleFrequency === "weekly"
            ? (body.exportScheduleFrequency as ExportScheduleFrequency)
            : body.exportScheduleFrequency === null
              ? null
              : undefined,
        channel:
          body.exportScheduleChannel === "bucket" || body.exportScheduleChannel === "sftp"
            ? (body.exportScheduleChannel as ExportScheduleChannel)
            : body.exportScheduleChannel === null
              ? null
              : undefined,
      }),
      updateWarehouseDeliveryConfig(auth.org.orgId, {
        enabled:
          body.warehouseEnabled !== undefined ? Boolean(body.warehouseEnabled) : undefined,
        provider:
          body.warehouseProvider === "snowflake" || body.warehouseProvider === "bigquery"
            ? (body.warehouseProvider as WarehouseProvider)
            : body.warehouseProvider === null
              ? null
              : undefined,
        snowflakeAccount:
          typeof body.snowflakeAccount === "string"
            ? body.snowflakeAccount.trim() || null
            : body.snowflakeAccount,
        snowflakeWarehouse:
          typeof body.snowflakeWarehouse === "string"
            ? body.snowflakeWarehouse.trim() || null
            : body.snowflakeWarehouse,
        snowflakeDatabase:
          typeof body.snowflakeDatabase === "string"
            ? body.snowflakeDatabase.trim() || null
            : body.snowflakeDatabase,
        snowflakeSchema:
          typeof body.snowflakeSchema === "string" ? body.snowflakeSchema.trim() : undefined,
        snowflakeTable:
          typeof body.snowflakeTable === "string"
            ? body.snowflakeTable.trim() || null
            : body.snowflakeTable,
        snowflakeUser:
          typeof body.snowflakeUser === "string" ? body.snowflakeUser.trim() : undefined,
        snowflakePassword:
          typeof body.snowflakePassword === "string" ? body.snowflakePassword : undefined,
        bqProjectId:
          typeof body.bqProjectId === "string" ? body.bqProjectId.trim() || null : body.bqProjectId,
        bqDataset:
          typeof body.bqDataset === "string" ? body.bqDataset.trim() || null : body.bqDataset,
        bqTable: typeof body.bqTable === "string" ? body.bqTable.trim() || null : body.bqTable,
        bqServiceAccountJson:
          typeof body.bqServiceAccountJson === "string"
            ? body.bqServiceAccountJson.trim()
            : undefined,
      }),
    ]);
    return NextResponse.json({ config, bucket, sftp, schedule, warehouse });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update settings" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = (body as { action?: string }).action;

  try {
    if (action === "rotate_api_key") {
      const scope = typeof body.scope === "string" ? body.scope : "read_write";
      const { apiKey, prefix, scope: savedScope } = await rotateOrgApiKey(auth.org.orgId, scope);
      return NextResponse.json({
        apiKey,
        prefix,
        scope: savedScope,
        message: "Copy this key now — it will not be shown again.",
      });
    }
    if (action === "revoke_api_key") {
      await revokeOrgApiKey(auth.org.orgId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 },
    );
  }
}
