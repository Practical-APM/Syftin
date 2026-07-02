# Buyer data delivery

How enterprise buyers (Persona A) receive structured data from completed jobs.

---

## Delivery channels

| Channel | Best for | Setup |
|---------|----------|-------|
| **Dashboard download** | Ad-hoc exports | `/dashboard/exports` or job detail |
| **REST API** | Pipelines, warehouses, cron jobs | `/dashboard/integrations` → API key |
| **Webhooks** | Real-time push to your app | `/dashboard/integrations` → webhook URL |
| **Bucket push** | Land files in your cloud storage | `/dashboard/integrations` → S3 or GCS |
| **SFTP drop** | Legacy file intake / partner SFTP | `/dashboard/integrations` → SFTP |
| **Warehouse load** | Snowflake / BigQuery row insert | `/dashboard/integrations` → Data warehouse |
| **Scheduled batches** | Daily/weekly NDJSON bundles | `/dashboard/integrations` → Scheduled exports |
| **CSV** | Excel, Sheets, BI tools | `?format=csv` on any result endpoint |
| **NDJSON** | Streaming ETL | `?format=ndjson` |

---

## Export formats

### JSON (default)
Array of objects matching your submitted schema.

```
GET /api/jobs/{id}/result
GET /api/v1/jobs/{id}/result
```

### CSV
Header row + one row per record. Nested fields are JSON-encoded in cells.

```
GET /api/jobs/{id}/result?format=csv
```

### NDJSON
Newline-delimited JSON — one object per line for stream processing.

```
GET /api/jobs/{id}/result?format=ndjson
```

Set a workspace default under **Integrations → Export formats**.

---

## REST API (v1)

Authenticate with a workspace API key:

```bash
# Generate key: Dashboard → Integrations → Generate API key

curl -H "Authorization: Bearer sftn_live_…" \
  https://app.syftin.io/api/v1/jobs

curl -H "Authorization: Bearer sftn_live_…" \
  "https://app.syftin.io/api/v1/jobs/{jobId}/result?format=csv"
```

Or header: `X-Api-Key: sftn_live_…`

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/jobs` | List jobs in your workspace |
| `GET /api/v1/jobs/:id` | Job metadata + download URLs |
| `GET /api/v1/jobs/:id/result` | Export file (`format=json\|csv\|ndjson`) |

Session-based routes (`/api/jobs`) remain available when signed in via the dashboard.

---

## Webhooks

When a job reaches `completed` or `failed`, Syftin can POST to your HTTPS endpoint.

### Setup

1. **Integrations** → enter webhook URL and optional signing secret
2. Enable **Webhooks for completed jobs**
3. Optionally enable **Notify on job failures**
4. **Send test** to verify connectivity

### Events

| Event | When |
|-------|------|
| `ping` | Test button from dashboard |
| `job.completed` | Job finished successfully |
| `job.failed` | Job failed (requires **Notify on job failures**) |

### Payload (`job.completed`)

```json
{
  "event": "job.completed",
  "job_id": "…",
  "organization_id": "…",
  "name": "Blinkit Mumbai pricing",
  "domain": "blinkit.com",
  "target_url": "https://blinkit.com",
  "record_count": 1240,
  "compliance_score": 99.2,
  "completed_at": "2026-07-01T12:00:00Z",
  "download_urls": {
    "json": "https://app.syftin.io/api/v1/jobs/…/result",
    "csv": "https://app.syftin.io/api/v1/jobs/…/result?format=csv",
    "ndjson": "https://app.syftin.io/api/v1/jobs/…/result?format=ndjson"
  }
}
```

Optional `data` array when **Include row data** is enabled (small jobs only).

### Payload (`job.failed`)

```json
{
  "event": "job.failed",
  "job_id": "…",
  "organization_id": "…",
  "name": "Blinkit Mumbai pricing",
  "domain": "blinkit.com",
  "target_url": "https://blinkit.com",
  "error_message": "timeout waiting for selector",
  "failed_at": "2026-07-01T12:00:00Z"
}
```

### Signature verification

Header: `X-Syftin-Signature: sha256=<hex>`

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verify(body: string, signature: string, secret: string) {
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### Delivery reliability

- DB trigger enqueues delivery on job completion
- Hub worker calls `/api/internal/jobs/:id/deliver` immediately (when configured)
- Hourly cron retries pending and failed deliveries (up to 5 attempts each)
- Audit log visible in **Integrations**

---

## Bucket push (S3 / GCS)

When a job completes, Syftin can upload the export file directly to your bucket.

### Setup

1. **Integrations → Bucket push**
2. Choose **S3-compatible** (AWS, Cloudflare R2, MinIO) or **Google Cloud Storage**
3. Enter bucket name, prefix, and credentials
4. Enable **bucket push on job completion**
5. **Upload test file** to verify permissions

### Object layout

```
{prefix}{organization_id}/{job_id}/syftin-{job_id}.{json|csv|ndjson}
```

Example: `syftin/a1b2…/c3d4…/syftin-c3d4….csv`

Format follows your workspace **default export format** (JSON, CSV, or NDJSON).

### S3-compatible providers

| Field | AWS S3 | Cloudflare R2 |
|-------|--------|---------------|
| Region | e.g. `ap-south-1` | `auto` |
| Endpoint | leave blank | `https://<account>.r2.cloudflarestorage.com` |
| Credentials | IAM access key + secret | R2 API token (S3-compatible) |

### GCS

Paste a service account JSON with **Storage Object Creator** (or broader) on the target bucket. Project ID is read from the JSON if omitted.

### Security

Bucket credentials are encrypted at rest using `INTERNAL_DELIVERY_SECRET` (AES-256-GCM). They are never returned to the browser after save.

### Reliability

Same retry pipeline as webhooks — DB trigger enqueues on completion, hub worker delivers immediately, hourly cron retries failures (up to 5 attempts).

---

## SFTP drop

When a job completes, Syftin can upload the export file to your SFTP server.

### Setup

1. **Integrations → SFTP drop**
2. Enter host, port, username, and remote base path (e.g. `/syftin`)
3. Choose **password** or **SSH private key** authentication
4. Enable **SFTP drop on job completion**
5. **Upload test file** to verify connectivity

### File layout

```
{remote_path}/{organization_id}/{job_id}/syftin-{job_id}.{json|csv|ndjson}
```

Example: `/syftin/a1b2…/c3d4…/syftin-c3d4….csv`

Parent directories are created automatically. Format follows your workspace default export format.

### Security

SFTP credentials are encrypted at rest using `INTERNAL_DELIVERY_SECRET` (AES-256-GCM).

### Reliability

Same retry pipeline as webhooks and bucket push.

---

## Environment (ops)

**Web (Vercel):**

```env
INTERNAL_DELIVERY_SECRET=...   # openssl rand -hex 32
```

**Worker VM:**

```env
SYFTIN_API_URL=https://app.syftin.io
INTERNAL_DELIVERY_SECRET=...   # same as web
```

---

## Database

Migration `20260701000018_org_delivery.sql`:

- `organizations.webhook_*`, `api_key_*`, `default_export_format`
- `job_delivery_log` audit table
- Trigger on `jobs.status → completed`

Migration `20260701000021_webhook_job_failed.sql` — `job.failed` webhooks.

Migration `20260701000022_bucket_delivery.sql` — S3/GCS bucket push, `bucket` delivery channel.

Migration `20260701000023_sftp_delivery.sql` — SFTP drop, `sftp` delivery channel.

---

## Future (not yet built)

- Enterprise ops: Redis rate limiting, log drain (see [READINESS.md](../READINESS.md))

---

## Scheduled batch exports

Daily or weekly NDJSON bundles of all jobs completed since the last run.

### Setup

1. Configure **bucket** or **SFTP** delivery first
2. **Integrations → Scheduled batch exports** — choose frequency and channel
3. Cron `/api/cron/scheduled-exports` runs daily at **02:00 UTC** (Vercel)

### Batch file layout

```
{bucket_prefix}batches/{org_id}/syftin-batch-{YYYY-MM-DD}.ndjson
```

Each line:

```json
{"job_id":"…","organization_id":"…","name":"…","domain":"…","completed_at":"…","record":{…}}
```

Audit log: `export_batch_log` table.

---

## Snowflake / BigQuery direct load

Per-record INSERT on each job completion (warehouse channel).

### Target table schema

Create this table in Snowflake or BigQuery before enabling:

| Column | Type |
|--------|------|
| `job_id` | STRING |
| `organization_id` | STRING |
| `domain` | STRING |
| `job_name` | STRING |
| `completed_at` | TIMESTAMP |
| `payload` | VARIANT (Snowflake) / JSON (BigQuery) |
| `loaded_at` | TIMESTAMP |

### Snowflake

- Account identifier, warehouse, database, schema, table, username/password
- Uses `snowflake-sdk` with `INSERT … PARSE_JSON(?)`

### BigQuery

- Project, dataset, table, service account JSON with `bigquery.dataEditor`
- Uses `insertAll` streaming API

---

## Migrations

Migration `20260701000024_scheduled_exports.sql` — schedule columns + `export_batch_log`.

Migration `20260701000025_warehouse_delivery.sql` — Snowflake/BigQuery config + `warehouse` channel.

---

*See also: [PILOT_E2E.md](./PILOT_E2E.md), [PRODUCTION.md](./PRODUCTION.md)*
