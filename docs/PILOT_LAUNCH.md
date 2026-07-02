# Pilot launch checklist

Run this before inviting your first design partner or contributor cohort.

---

## 1. Database

Apply all migrations through `20260701000020_node_resource_telemetry.sql`:

```bash
# Supabase SQL editor — run files in order from supabase/migrations/
```

Enable Realtime on `jobs` if not already (migration `000002`).

---

## 2. Automated pre-flight

```bash
bash scripts/pilot-launch-check.sh https://app.syftin.io
# or locally:
bash scripts/pilot-launch-check.sh http://localhost:3000
```

---

## 3. Node binaries (contributors)

**Option A — GitHub Release (production)**

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Set on Vercel:

```env
SYFTIN_GITHUB_REPO=your-org/projectS
SYFTIN_RELEASE_TAG=v0.1.0
```

**Option B — Local build (dev)**

```bash
bash worker/scripts/build-node-release.sh darwin-arm64   # your machine
# or all platforms:
bash worker/scripts/build-node-release.sh all
```

Verify: `/contributor/download` shows “Binaries available on this server”.

---

## 4. Production env (minimum)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_AUTH_REQUIRED=true` | Gate dashboard |
| `CRON_SECRET` | Health + contributor ops cron |
| `HEALTH_CHECK_SECRET` | Detailed `/api/health` |
| `INTERNAL_DELIVERY_SECRET` | Worker → immediate webhooks |
| `SLACK_OPS_WEBHOOK_URL` | Missed heartbeat alerts |
| `PLATFORM_ADMIN_EMAILS` | Admin access |
| `PILOT_INVITE_EMAILS` | Buyer invites |
| `CONTRIBUTOR_INVITE_EMAILS` | Contributor invites (Phase 2) |

---

## 5. Hub worker

```bash
cd worker
# .env: SUPABASE_*, OLLAMA_*, SYFTIN_API_URL, INTERNAL_DELIVERY_SECRET
go run ./cmd/worker
```

Confirm `/api/health` shows `worker: true` within 30s.

---

## 6. End-to-end smoke

| Persona | Path |
|---------|------|
| **Buyer** | Sign in → DPA → create job → download JSON |
| **Contributor** | Sign in → UPI → register device → install node → online |
| **Admin** | `/admin` overview green → fleet → payouts |

Distributed fetch: hub worker + edge node both running, job uses edge HTML.

Webhooks: Integrations → URL → test ping → complete a job → delivery log shows `delivered`.

---

## 7. Cron (Vercel)

`web/vercel.json`:

- Every 5 min: `/api/cron/health-alerts`
- Hourly: `/api/cron/contributor-ops` (fetch reclaim, webhook retry, payouts)

Manual test:

```bash
curl -X POST "$SITE/api/cron/health-alerts" -H "Authorization: Bearer $CRON_SECRET"
```

---

## Readiness score

See [READINESS.md](../READINESS.md) — target **91+** for closed pilot.

---

*See also: [DEPLOY.md](../DEPLOY.md), [PILOT_E2E.md](./PILOT_E2E.md), [PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md)*
