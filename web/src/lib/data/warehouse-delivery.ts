import snowflake from "snowflake-sdk";
import { GoogleAuth } from "google-auth-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getJobResult } from "@/lib/data/jobs";
import {
  decryptField,
  encryptField,
  getFieldCipherSecret,
} from "@/lib/security/field-cipher";

export type WarehouseProvider = "snowflake" | "bigquery";

export type WarehouseDeliveryConfig = {
  enabled: boolean;
  provider: WarehouseProvider | null;
  snowflakeAccount: string | null;
  snowflakeWarehouse: string | null;
  snowflakeDatabase: string | null;
  snowflakeSchema: string;
  snowflakeTable: string | null;
  hasSnowflakeCredentials: boolean;
  bqProjectId: string | null;
  bqDataset: string | null;
  bqTable: string | null;
  hasBqCredentials: boolean;
};

type BqCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function parseWarehouseRow(row: Record<string, unknown>): WarehouseDeliveryConfig {
  return {
    enabled: Boolean(row.warehouse_enabled),
    provider: (row.warehouse_provider as WarehouseProvider | null) ?? null,
    snowflakeAccount: (row.snowflake_account as string | null) ?? null,
    snowflakeWarehouse: (row.snowflake_warehouse as string | null) ?? null,
    snowflakeDatabase: (row.snowflake_database as string | null) ?? null,
    snowflakeSchema: (row.snowflake_schema as string | null) ?? "PUBLIC",
    snowflakeTable: (row.snowflake_table as string | null) ?? null,
    hasSnowflakeCredentials: Boolean(row.snowflake_user_enc && row.snowflake_password_enc),
    bqProjectId: (row.bq_project_id as string | null) ?? null,
    bqDataset: (row.bq_dataset as string | null) ?? null,
    bqTable: (row.bq_table as string | null) ?? null,
    hasBqCredentials: Boolean(row.bq_credentials_enc),
  };
}

export async function getWarehouseDeliveryConfig(orgId: string): Promise<WarehouseDeliveryConfig> {
  if (!isSupabaseConfigured()) {
    return {
      enabled: false,
      provider: null,
      snowflakeAccount: null,
      snowflakeWarehouse: null,
      snowflakeDatabase: null,
      snowflakeSchema: "PUBLIC",
      snowflakeTable: null,
      hasSnowflakeCredentials: false,
      bqProjectId: null,
      bqDataset: null,
      bqTable: null,
      hasBqCredentials: false,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(
      "warehouse_enabled, warehouse_provider, snowflake_account, snowflake_warehouse, snowflake_database, snowflake_schema, snowflake_table, snowflake_user_enc, snowflake_password_enc, bq_project_id, bq_dataset, bq_table, bq_credentials_enc",
    )
    .eq("id", orgId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Organization not found");
  return parseWarehouseRow(data);
}

export async function updateWarehouseDeliveryConfig(
  orgId: string,
  input: {
    enabled?: boolean;
    provider?: WarehouseProvider | null;
    snowflakeAccount?: string | null;
    snowflakeWarehouse?: string | null;
    snowflakeDatabase?: string | null;
    snowflakeSchema?: string;
    snowflakeTable?: string | null;
    snowflakeUser?: string;
    snowflakePassword?: string;
    bqProjectId?: string | null;
    bqDataset?: string | null;
    bqTable?: string | null;
    bqServiceAccountJson?: string;
  },
): Promise<WarehouseDeliveryConfig> {
  if (!isSupabaseConfigured()) return getWarehouseDeliveryConfig(orgId);

  const cipherSecret = getFieldCipherSecret();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.enabled !== undefined) patch.warehouse_enabled = input.enabled;
  if (input.provider !== undefined) patch.warehouse_provider = input.provider;
  if (input.snowflakeAccount !== undefined) patch.snowflake_account = input.snowflakeAccount;
  if (input.snowflakeWarehouse !== undefined) patch.snowflake_warehouse = input.snowflakeWarehouse;
  if (input.snowflakeDatabase !== undefined) patch.snowflake_database = input.snowflakeDatabase;
  if (input.snowflakeSchema !== undefined) patch.snowflake_schema = input.snowflakeSchema;
  if (input.snowflakeTable !== undefined) patch.snowflake_table = input.snowflakeTable;
  if (input.bqProjectId !== undefined) patch.bq_project_id = input.bqProjectId;
  if (input.bqDataset !== undefined) patch.bq_dataset = input.bqDataset;
  if (input.bqTable !== undefined) patch.bq_table = input.bqTable;

  if (input.snowflakeUser !== undefined || input.snowflakePassword !== undefined) {
    if (!cipherSecret) {
      throw new Error("INTERNAL_DELIVERY_SECRET is required to store warehouse credentials.");
    }
    if (input.snowflakeUser) {
      patch.snowflake_user_enc = encryptField(input.snowflakeUser, cipherSecret);
    }
    if (input.snowflakePassword) {
      patch.snowflake_password_enc = encryptField(input.snowflakePassword, cipherSecret);
    }
  }

  if (input.bqServiceAccountJson !== undefined) {
    if (!cipherSecret) {
      throw new Error("INTERNAL_DELIVERY_SECRET is required to store warehouse credentials.");
    }
    const parsed = JSON.parse(input.bqServiceAccountJson) as BqCredentials;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("BigQuery service account JSON must include client_email and private_key.");
    }
    patch.bq_credentials_enc = encryptField(input.bqServiceAccountJson, cipherSecret);
    if (!input.bqProjectId && parsed.project_id) {
      patch.bq_project_id = parsed.project_id;
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(patch).eq("id", orgId);
  if (error) throw new Error(error.message);
  return getWarehouseDeliveryConfig(orgId);
}

function warehouseConfigReady(config: WarehouseDeliveryConfig): boolean {
  if (!config.enabled || !config.provider) return false;
  if (config.provider === "snowflake") {
    return (
      Boolean(config.snowflakeAccount) &&
      Boolean(config.snowflakeWarehouse) &&
      Boolean(config.snowflakeDatabase) &&
      Boolean(config.snowflakeTable) &&
      config.hasSnowflakeCredentials
    );
  }
  return (
    Boolean(config.bqProjectId) &&
    Boolean(config.bqDataset) &&
    Boolean(config.bqTable) &&
    config.hasBqCredentials
  );
}

async function loadSnowflakeCredentials(orgId: string): Promise<{
  username: string;
  password: string;
} | null> {
  const cipherSecret = getFieldCipherSecret();
  if (!cipherSecret) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("snowflake_user_enc, snowflake_password_enc")
    .eq("id", orgId)
    .single();
  if (!data?.snowflake_user_enc || !data?.snowflake_password_enc) return null;
  return {
    username: decryptField(data.snowflake_user_enc, cipherSecret),
    password: decryptField(data.snowflake_password_enc, cipherSecret),
  };
}

async function loadBqCredentials(orgId: string): Promise<BqCredentials | null> {
  const cipherSecret = getFieldCipherSecret();
  if (!cipherSecret) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("bq_credentials_enc")
    .eq("id", orgId)
    .single();
  if (!data?.bq_credentials_enc) return null;
  return JSON.parse(decryptField(data.bq_credentials_enc, cipherSecret)) as BqCredentials;
}

function snowflakeConnect(
  config: WarehouseDeliveryConfig,
  creds: { username: string; password: string },
): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    const conn = snowflake.createConnection({
      account: config.snowflakeAccount!,
      username: creds.username,
      password: creds.password,
      warehouse: config.snowflakeWarehouse!,
      database: config.snowflakeDatabase!,
      schema: config.snowflakeSchema,
    });
    conn.connect((err) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

function snowflakeExecute(
  conn: snowflake.Connection,
  sqlText: string,
  binds: snowflake.Binds,
): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err) => {
        if (err) reject(err);
        else resolve();
      },
    });
  });
}

async function insertSnowflakeRows(
  config: WarehouseDeliveryConfig,
  creds: { username: string; password: string },
  rows: Array<{
    job_id: string;
    organization_id: string;
    domain: string;
    name: string;
    completed_at: string | null;
    payload: Record<string, unknown>;
  }>,
): Promise<void> {
  const table = `${config.snowflakeDatabase}.${config.snowflakeSchema}.${config.snowflakeTable}`;
  const conn = await snowflakeConnect(config, creds);
  try {
    const sql = `INSERT INTO ${table} (job_id, organization_id, domain, job_name, completed_at, payload, loaded_at)
      SELECT ?, ?, ?, ?, ?, PARSE_JSON(?), CURRENT_TIMESTAMP()`;
    for (const row of rows) {
      await snowflakeExecute(conn, sql, [
        row.job_id,
        row.organization_id,
        row.domain,
        row.name,
        row.completed_at,
        JSON.stringify(row.payload),
      ]);
    }
  } finally {
    await new Promise<void>((resolve) => {
      conn.destroy(() => resolve());
    });
  }
}

async function insertBigQueryRows(
  config: WarehouseDeliveryConfig,
  creds: BqCredentials,
  rows: Array<{
    job_id: string;
    organization_id: string;
    domain: string;
    name: string;
    completed_at: string | null;
    payload: Record<string, unknown>;
  }>,
): Promise<void> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/bigquery.insertdata"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Could not obtain BigQuery access token");

  const projectId = config.bqProjectId!;
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${config.bqDataset}/tables/${config.bqTable}/insertAll`;
  const body = {
    rows: rows.map((row) => ({
      json: {
        job_id: row.job_id,
        organization_id: row.organization_id,
        domain: row.domain,
        job_name: row.name,
        completed_at: row.completed_at,
        payload: row.payload,
        loaded_at: new Date().toISOString(),
      },
    })),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`BigQuery insert failed: HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`);
  }

  const parsed = (await res.json()) as { insertErrors?: unknown[] };
  if (parsed.insertErrors?.length) {
    throw new Error(`BigQuery insert errors: ${JSON.stringify(parsed.insertErrors).slice(0, 200)}`);
  }
}

export async function deliverJobToWarehouse(
  jobId: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string; rowCount?: number }> {
  if (!isSupabaseConfigured()) return { ok: true, skipped: true };

  const admin = createAdminClient();
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("id, organization_id, status, name, domain, completed_at")
    .eq("id", jobId)
    .single();

  if (jobError || !job || job.status !== "completed") {
    return { ok: false, error: "Job not found or not completed." };
  }

  const config = await getWarehouseDeliveryConfig(job.organization_id);
  if (!warehouseConfigReady(config)) {
    await markWarehouseSkipped(admin, jobId, job.organization_id);
    return { ok: true, skipped: true };
  }

  const resultRows = await getJobResult(jobId, {
    orgId: job.organization_id,
    orgName: "",
    dpaSignedAt: null,
    role: "api",
  });
  if (!resultRows?.length) {
    return { ok: false, error: "Job result not found." };
  }

  const rows = resultRows.map((payload) => ({
    job_id: job.id,
    organization_id: job.organization_id,
    domain: job.domain,
    name: job.name,
    completed_at: job.completed_at,
    payload,
  }));

  let lastError: string | null = null;
  try {
    if (config.provider === "snowflake") {
      const creds = await loadSnowflakeCredentials(job.organization_id);
      if (!creds) throw new Error("Snowflake credentials not configured.");
      await insertSnowflakeRows(config, creds, rows);
    } else {
      const creds = await loadBqCredentials(job.organization_id);
      if (!creds) throw new Error("BigQuery credentials not configured.");
      await insertBigQueryRows(config, creds, rows);
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Warehouse load failed";
  }

  const delivered = !lastError;
  const { data: logRow } = await admin
    .from("job_delivery_log")
    .select("attempt_count")
    .eq("job_id", jobId)
    .eq("channel", "warehouse")
    .eq("event_type", "job.completed")
    .maybeSingle();

  await admin
    .from("job_delivery_log")
    .upsert(
      {
        job_id: jobId,
        organization_id: job.organization_id,
        channel: "warehouse",
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
    ? { ok: true, rowCount: rows.length }
    : { ok: false, error: lastError ?? "Warehouse delivery failed" };
}

async function markWarehouseSkipped(
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
        channel: "warehouse",
        event_type: "job.completed",
        status: "skipped",
        delivered_at: new Date().toISOString(),
      },
      { onConflict: "job_id,channel,event_type" },
    );
}
