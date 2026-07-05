# Vercel Cron Jobs Configuration

Vercel Hobby allows **one** cron per project. `vercel.json` currently runs only
`health-alerts`. Re-enable the rest when you upgrade to Pro (or run them via an
external scheduler hitting the same routes with `CRON_SECRET`).

Add these back to `vercel.json` `crons` array:

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

Manual trigger (requires `CRON_SECRET`):

```bash
curl -X POST "https://app.syftin.io/api/cron/contributor-ops" \
  -H "Authorization: Bearer $CRON_SECRET"
```
