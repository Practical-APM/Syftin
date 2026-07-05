# Vercel Cron Jobs Configuration

**Vercel Hobby blocks deploys** if any cron would run more than once per day
(e.g. `*/5 * * * *` or `0 * * * *`). `vercel.json` has **no crons** so deploys
succeed on Hobby. Trigger jobs externally (see below) or add a **once-daily**
schedule after upgrading to Pro.

## Once-daily only (Hobby-safe)

If you want one built-in Vercel cron on Hobby, use a daily expression only:

```json
{
  "crons": [
    {
      "path": "/api/cron/contributor-ops",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Full schedule (Pro / external scheduler)

Re-enable in `vercel.json` on Pro, or ping these routes from cron-job.org,
GitHub Actions, etc. with `Authorization: Bearer $CRON_SECRET`:

```json
{
  "crons": [
    {
      "path": "/api/cron/health-alerts",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/contributor-ops",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/scheduled-exports",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/analytics-snapshots",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/purge-payloads",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/drain-logs",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/process-refunds",
      "schedule": "30 5 * * *"
    }
  ]
}
```

| Cron | Schedule | Purpose |
|------|----------|---------|
| `health-alerts` | Every 5 min | Worker/Ollama/node heartbeat + ops alerts |
| `contributor-ops` | Hourly | Stale fetches, payouts, delivery + webhook retries |
| `scheduled-exports` | Daily 02:00 UTC | Per-org batch exports |
| `analytics-snapshots` | Daily 03:00 UTC | Daily metrics aggregation |
| `purge-payloads` | Daily 04:00 UTC | Drop raw `html_payload` older than `PAYLOAD_RETENTION_DAYS` (default 7) |
| `drain-logs` | Daily 05:00 UTC | Log drain / retention |
| `process-refunds` | Daily 05:30 UTC | Refund processing |

Manual trigger (requires `CRON_SECRET` on Vercel):

```bash
curl -X POST "https://app.syftin.io/api/cron/health-alerts" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST "https://app.syftin.io/api/cron/contributor-ops" \
  -H "Authorization: Bearer $CRON_SECRET"
```
