# Vercel Cron Jobs Configuration

When you want to implement the cron jobs later, add this to your `vercel.json`:

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
    }
  ]
}
```

`purge-payloads` drops raw `html_payload` from fetch_tasks older than
`PAYLOAD_RETENTION_DAYS` (default 7) to keep Postgres storage bounded.
