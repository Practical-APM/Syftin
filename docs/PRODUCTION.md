# Production hardening

Checklist and reference for deploying Syftin beyond local development.

---

## Security headers

Applied globally via `next.config.ts` and middleware:

- `Strict-Transport-Security` (production only)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo disabled)

---

## Rate limiting

In-memory limits (pilot scale). For multi-region or high traffic, move to Redis / Upstash.

| Endpoint | Limit | Key |
|----------|-------|-----|
| `POST /api/waitlist` | 5 / min | Client IP |
| `GET /api/node/tasks/claim` | 120 / min | Client IP |
| `POST /api/node/*` | 30–60 / min | Client IP |
| `POST /api/jobs` | 30 / hour | User ID |
| `POST /api/payments/razorpay/order` | 10 / min | Org ID |

Responses use `429` with `Retry-After`.

---

## Health checks

### Public (uptime monitors)

```bash
curl https://app.syftin.io/api/health
# {"status":"ready","supabase":true,"worker":true,"ollama":true}
```

### Detailed (operators)

Set `HEALTH_CHECK_SECRET` and pass:

```bash
curl -H "Authorization: Bearer $HEALTH_CHECK_SECRET" https://app.syftin.io/api/health
```

Returns worker last seen, contributor nodes online, pending fetch tasks.

Admin dashboard `/admin` uses the same signals via `/api/admin/overview`.

---

## Startup validation

`src/instrumentation.ts` logs env warnings/errors in production when the Node.js runtime starts:

- Missing `NEXT_PUBLIC_SITE_URL`
- Missing Supabase keys
- `NEXT_PUBLIC_AUTH_REQUIRED` not true
- Empty `PLATFORM_ADMIN_EMAILS`
- Razorpay misconfiguration

Review Vercel **Runtime Logs** after first deploy.

---

## Required production env

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://app.syftin.io
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_AUTH_REQUIRED=true
NEXT_PUBLIC_SHOW_DEV_SETUP=false
PLATFORM_ADMIN_EMAILS=ops@syftin.io
HEALTH_CHECK_SECRET=...          # openssl rand -hex 32
CRON_SECRET=...                  # Vercel Cron + platform ops
INTERNAL_DELIVERY_SECRET=...     # Worker → /api/internal/jobs/:id/deliver (webhook trigger)
SLACK_OPS_WEBHOOK_URL=...        # Optional — heartbeat / backlog alerts
OLLAMA_BASE_URL=http://...       # internal worker URL for health probe
SYFTIN_ENV=production            # Worker VM — JSON structured logs
```

Phase 2 (if enabled): Razorpay keys, webhook secrets, `CONTRIBUTOR_INVITE_EMAILS`.

---

## Node API hardening

Contributor edge nodes authenticate with `Authorization: Bearer sftn_...`:

- Invalid tokens rate-limited per IP
- HTML upload capped at **2 MB** (`Content-Length` + body check)
- Tasks must be claimed by the same node before complete

---

## Worker reliability

Hub worker (`go run ./cmd/worker`):

- Heartbeat every poll interval → `worker_heartbeats` table
- Stale jobs requeued after 15 minutes
- Domain rate limit: 5s between fetches per domain
- **Structured JSON logs** when `SYFTIN_ENV=production` (pipe stdout to your log drain)

**Alerting:** Vercel Cron (see `web/vercel.json`):

| Schedule | Route | Purpose |
|----------|-------|---------|
| Every 5 min | `/api/cron/health-alerts` | Hub worker / Ollama / Supabase probes; contributor node offline sweep |
| Hourly | `/api/cron/contributor-ops` | Reclaim stuck fetches, optional auto-payouts, retry pending deliveries |
| Daily 02:00 UTC | `/api/cron/scheduled-exports` | Scheduled NDJSON batch exports per org |

Set `SLACK_OPS_WEBHOOK_URL` or `OPS_WEBHOOK_URL` to receive Slack/generic webhook alerts when:

- Hub worker heartbeat is stale (>30s)
- Ollama is down
- Contributor edge nodes miss heartbeat (90s, marked offline)
- Fetch backlog with no online contributor nodes

Alerts dedupe per issue type (4h cooldown, persisted in `ops_alert_cooldowns`).

```bash
# Manual health alert trigger
curl -X POST https://app.syftin.io/api/cron/health-alerts \
  -H "Authorization: Bearer $CRON_SECRET"
```

Requires `CRON_SECRET` in project env — Vercel sends it as `Authorization: Bearer …` automatically.

---

## Webhook security

- Razorpay / RazorpayX: HMAC signature verification (required)
- Webhook routes are public but reject unsigned payloads

---

## Migrations

Apply through `20260701000017_ops_alert_cooldowns.sql` before go-live.

---

## Pre-launch smoke test

```bash
# 1. Public health
curl -s https://app.syftin.io/api/health | jq .

# 2. Detailed health (with secret)
curl -s -H "Authorization: Bearer $HEALTH_CHECK_SECRET" \
  https://app.syftin.io/api/health | jq .

# 3. Auth gate
curl -s -o /dev/null -w "%{http_code}" https://app.syftin.io/api/jobs
# Expect 401

# 4. Admin (signed-in browser) — /admin shows ready status
```

---

*See also: [DEPLOY.md](./DEPLOY.md), [PILOT_E2E.md](./PILOT_E2E.md)*
