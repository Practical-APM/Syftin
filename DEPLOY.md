# Syftin Pilot Deployment Guide

Deploy Syftin for a **design-partner pilot** (3–10 customers) with isolated workspaces, magic-link auth, and a dedicated worker.

## Architecture

| Component | Recommended host | Notes |
|-----------|------------------|-------|
| Web dashboard | [Vercel](https://vercel.com) | Next.js 16 |
| Database + Auth | [Supabase](https://supabase.com) | Postgres, RLS, Realtime |
| Worker + Ollama | VM (8GB+ RAM) | Mac M2 locally; Linux VM for pilot |
| LLM | Ollama on worker VM | `qwen2.5:3b-instruct-q4_K_M` |

## 1. Supabase production project

1. Create a new Supabase project (production).
2. Run migrations in order from `supabase/migrations/` through `20260701000020_node_resource_telemetry.sql` (000000–000020).
3. Enable Realtime on the `jobs` table (migration 002).
4. In Authentication → URL configuration, set:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`

### Invite pilot customers

Add rows to `pilot_invites` before they sign in:

```sql
INSERT INTO pilot_invites (email, organization_id)
VALUES ('customer@company.com', NULL);
-- NULL org_id → Syftin creates a dedicated workspace on first login
```

Or set `PILOT_INVITE_EMAILS=customer@company.com,other@co.com` on the web app.

## 2. Web app (Vercel)

Environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Server only — never expose to client
NEXT_PUBLIC_SITE_URL=https://app.syftin.io
NEXT_PUBLIC_AUTH_REQUIRED=true
NEXT_PUBLIC_SHOW_DEV_SETUP=false
PILOT_INVITE_EMAILS=pilot1@co.com,pilot2@co.com
PLATFORM_ADMIN_EMAILS=you@syftin.io
HEALTH_CHECK_SECRET=...                 # openssl rand -hex 32
OLLAMA_BASE_URL=http://worker-internal:11434
```

Production hardening (rate limits, headers, smoke tests): [docs/PRODUCTION.md](./docs/PRODUCTION.md).

```env
# Phase 2 (optional)
NEXT_PUBLIC_PHASE2_ENABLED=true
PHASE2_DISTRIBUTED_FETCH=true
CONTRIBUTOR_INVITE_EMAILS=student@college.edu
# AUTO_DISBURSE_CONTRIBUTOR_PAYOUTS=true
# CRON_SECRET=your-random-secret
# INTERNAL_DELIVERY_SECRET=...   # same value on worker VM
# SLACK_OPS_WEBHOOK_URL=...
# SYFTIN_GITHUB_REPO=your-org/projectS
# SYFTIN_RELEASE_TAG=v0.1.0
```

Pre-flight script: `bash scripts/pilot-launch-check.sh https://app.syftin.io` — see [docs/PILOT_LAUNCH.md](./docs/PILOT_LAUNCH.md).

Deploy:

```bash
cd web
npm run build   # verify locally first
# Push to GitHub; connect repo in Vercel; set root directory to web/
```

## 3. Worker VM

### Option A — Docker

```bash
cd worker
docker build -t syftin-worker .
docker run --env-file .env --restart unless-stopped syftin-worker
```

### Option B — Bare metal (Mac / Linux)

```bash
cd worker
cp .env.example .env
# Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
bash scripts/install-playwright.sh
ollama pull qwen2.5:3b-instruct-q4_K_M
go run ./cmd/worker
```

Use `systemd` or `launchd` to keep the worker running.

Worker `.env`:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b-instruct-q4_K_M
FETCH_MODE=auto
WORKER_ID=pilot-worker-1
POLL_INTERVAL=10s
PHASE2_DISTRIBUTED_FETCH=true
SYFTIN_ENV=production
```

## 4. Phase 2 contributor network (optional)

1. Publish node binaries: `git tag v0.1.0 && git push origin v0.1.0` (or `bash worker/scripts/build-node-release.sh` for self-hosted `/releases/`).
2. Contributors install via one-liner from `/contributor/download` (no Supabase keys on their laptop).
3. Schedule maintenance cron (hourly recommended):

```bash
curl -X POST https://app.syftin.io/api/cron/contributor-ops \
  -H "Authorization: Bearer $CRON_SECRET"
```

- Hourly cron (`/api/cron/contributor-ops`) reclaims stuck fetches, retries failed webhooks (up to 5 attempts), and optionally auto-disburses UPI payouts.

See [docs/CONTRIBUTOR_PORTAL.md](./docs/CONTRIBUTOR_PORTAL.md).

## 5. Post-deploy smoke test

```bash
# Public health (minimal)
curl https://app.syftin.io/api/health

# Detailed health (set HEALTH_CHECK_SECRET on Vercel)
curl -H "Authorization: Bearer $HEALTH_CHECK_SECRET" https://app.syftin.io/api/health
```

# Benchmarks (on worker VM)
cd worker && bash scripts/run-benchmarks.sh
```

Manual pilot flow:

1. Pilot receives magic-link invite email
2. Signs in → workspace provisioned
3. Accepts DPA on first dashboard visit
4. Creates job on approved domain
5. Job completes → JSON download

## 6. Pilot support checklist

- [ ] Supabase migrations applied (through 000015)
- [ ] `PLATFORM_ADMIN_EMAILS` set for Persona C operators
- [ ] Pilot email in `pilot_invites` or `PILOT_INVITE_EMAILS`
- [ ] Worker heartbeat green in `/api/health`
- [ ] DPA acceptance recorded (`organizations.dpa_signed_at`)
- [ ] One successful end-to-end job per pilot customer
- [ ] Domain benchmarks run (`bash scripts/run-benchmarks.sh`)

## Security notes

- Each pilot gets an isolated `organization` via `organization_members`
- RLS restricts jobs to the user's org (migration 006)
- Service role key is used only for provisioning (`lib/auth/org.ts`)
- Job reads/writes use the user's session client when auth is required
