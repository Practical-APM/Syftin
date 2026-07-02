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
    }
  ]
}
```
