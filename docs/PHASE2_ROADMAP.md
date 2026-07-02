# Phase 2 — Contributor network & credits

Persona B (worker nodes) and buyer prepay credits. Enabled when `NEXT_PUBLIC_PHASE2_ENABLED=true` (default **on in development**).

**Contributor access guide:** [CONTRIBUTOR_PORTAL.md](./CONTRIBUTOR_PORTAL.md)

---

## What's built

### Contributor portal (`/contributor`)
- Overview — balance, devices online, payout progress
- Setup — UPI VPA, display name (hardware tier auto-detected on install)
- My devices — register node tokens
- Earnings — per-task history
- **Resource controls** — `/contributor/resources` (Eco / Balanced / Titan, thermal PID, AC/idle/metered guards); syncs to `syftin.config.toml` on node
### Node app distribution
- One-line installer (`/install-node.sh`) — prebuilt `syftin-node` + background service
- **Windows** — `/install-node.ps1` (native binary + Task Scheduler; Docker fallback)
- **Playwright / Chromium** — auto-install during setup (no Go or system Node required):
  - `syftin-playwright` CLI from `/releases/` (GitHub Actions on tag)
  - Fallback: `/install-playwright.sh` downloads Playwright driver from CDN + `install chromium`
- Build locally: `bash worker/scripts/build-node-release.sh`
- Release manifest: `/api/releases/manifest`

### Buyer credits (`/dashboard/credits`)
- Balance + transaction ledger
- **Razorpay checkout** — ₹500 / ₹2,000 / ₹5,000 packs (UPI, cards, netbanking)
- Demo top-up when Razorpay keys are unset
- Optional enforcement: `NEXT_PUBLIC_ENFORCE_CREDITS=true` (charges ₹5/job)

### Admin payouts (`/admin/payouts`)
- **RazorpayX UPI** — contact + fund account + payout API
- Webhook updates: `payout.processed` / `payout.failed` / `payout.reversed`
- Manual approve fallback when RazorpayX not configured
- Recent payout history with failure reasons

### Distributed fetch
- `fetch_tasks` table — edge nodes fetch HTML; hub worker runs LLM + validation
- **Tier-aware routing** — JS-heavy domains (Naukri, Flipkart, etc.) require Ranger+ nodes with Chromium; Scout nodes only claim light HTTP tasks
- `go run ./cmd/node` with `NODE_TOKEN` from contributor portal
- Hub worker uses edge HTML when `fetch_tasks.status = completed`

### Ops
- **Benchmark reports in Supabase** — worker uploads after `run-benchmarks.sh`; admin reads from DB
- **Contributor fleet** — `/admin/contributors` (live nodes, tiers, balances; stale nodes marked offline)
- **Contributor invites** — `/admin/contributor-invites`
- **Per-org domain whitelist** — Admin → Pilot workspaces → Manage domains; buyers see workspace subset on Compliance
- **Health alerts** — `/api/cron/health-alerts` every 5 min (hub worker heartbeat, Ollama, contributor nodes offline)
- **Contributor cron** — `/api/cron/contributor-ops` hourly (reclaim stuck fetches, optional auto-payouts); schedules in `web/vercel.json`

---

## Database

Apply migrations through `20260701000027_revenue_share.sql` (includes `000009`–`000026` if not yet applied).

### Contributor revenue share (`000027`)

- **70% default** of buyer job price goes to the contributor who completes the fetch (`CONTRIBUTOR_REVENUE_SHARE_BPS=7000`)
- **Tier multipliers:** Scout 1×, Ranger 1.25×, Titan 1.5× on the base share
- **GPU bonus:** +25% when edge Ollama inference runs (`edge_inference=true`)
- Example at ₹5/job: Scout **₹3.50**, Ranger **₹4.38**, Titan **₹4.50** (capped), Titan+GPU **₹4.50** (capped) — platform keeps at least 10%
- `platform_ledger` records buyer charge vs contributor payout vs platform net per completed job
- Constants: `web/src/lib/contributor/economics.ts`

**Next:** [PHASE3_ROADMAP.md](./PHASE3_ROADMAP.md) — job splitting, push dispatch, full split engine.

### Contributor resource autonomy

- **Portal** — `/contributor/resources` (Eco / Balanced / Titan profiles, CPU/RAM sliders, AC & idle guards)
- **Worker** — `resourceguard` package: PD thermal throttle, battery/metered/idle checks, `syftin.config.toml`
- **DB** — `contributors.resource_settings` JSONB; synced to nodes on register heartbeat
- **Estimator** — capacity calculator on `/contributor/download` (pilot earnings preview)

---

## Environment

### Web (`web/.env.local`)
```env
NEXT_PUBLIC_PHASE2_ENABLED=true
NEXT_PUBLIC_ENFORCE_CREDITS=false

# Razorpay — https://dashboard.razorpay.com/app/keys
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
# Webhook secret from Razorpay Dashboard → Webhooks → payment.captured
RAZORPAY_WEBHOOK_SECRET=whsec_...

# RazorpayX contributor UPI payouts
RAZORPAYX_ACCOUNT_NUMBER=232323005124781

CONTRIBUTOR_INVITE_EMAILS=student@college.edu
# CONTRIBUTOR_REVENUE_SHARE_BPS=7000   # 70% of job price to contributor
# JOB_PRICE_PAISE=500                  # ₹5 per job
# CONTRIBUTOR_OPEN=true
PHASE2_DISTRIBUTED_FETCH=true

# Optional: redirect /releases/* to GitHub when binaries not in web/public/releases/
SYFTIN_GITHUB_REPO=your-org/projectS
SYFTIN_RELEASE_TAG=v0.1.0

# Auto-send contributor UPI payouts when balance crosses ₹500 (RazorpayX required)
# AUTO_DISBURSE_CONTRIBUTOR_PAYOUTS=true
# CRON_SECRET=...   # Vercel Cron — health-alerts (5m) + contributor-ops (hourly)
# SLACK_OPS_WEBHOOK_URL=...   # Missed heartbeat / ops alerts
```

### Edge node (contributor laptop — no Supabase keys)

Contributors use **only** a device token and your site URL:

```env
NODE_TOKEN=sftn_...          # from /contributor/nodes
SYFTIN_API_URL=https://syftin.io
```

**One-line install** (from `/contributor/download`):

```bash
curl -fsSL "https://syftin.io/install-node.sh" | bash -s -- --token sftn_... --api https://syftin.io
```

The node app auto-detects RAM/CPU/Chromium, reports capabilities to Syftin, and runs as a background service. See [CONTRIBUTOR_PORTAL.md](./CONTRIBUTOR_PORTAL.md).

**Publish binaries:** tag `v0.1.0` → `.github/workflows/release-node.yml` builds `syftin-node-{os}-{arch}` for GitHub Releases.

### Hub worker (`worker/.env`)
```env
PHASE2_DISTRIBUTED_FETCH=true
SYFTIN_API_URL=https://app.syftin.io
INTERNAL_DELIVERY_SECRET=...   # same as web — immediate webhook on job complete
```

---

## Local test flow

1. Apply migration `000009`
2. `npm run dev` with Phase 2 flags
3. Sign in as contributor → `/login?next=/contributor`
4. Complete setup (UPI), register device, copy `NODE_TOKEN`
5. Terminal A: `go run ./cmd/worker` (hub)
6. Terminal B: install edge node via one-liner from `/contributor/download`, or `NODE_TOKEN=... SYFTIN_API_URL=http://localhost:3000 go run ./cmd/node`
   - **Demo mode (no Supabase):** register a device in the portal, then run the node — token auth and online status work in-memory
7. Buyer creates job → edge fetches → hub extracts → download JSON/CSV/NDJSON or receive webhook
8. Admin approves payout when balance ≥ ₹500

### Buyer data delivery

See [DATA_DELIVERY.md](./DATA_DELIVERY.md) — webhooks, API, bucket, SFTP, warehouse, scheduled batches (migrations `000018`–`000025`).

### Ops cron

| Schedule | Route | Purpose |
|----------|-------|---------|
| Every 5 min | `/api/cron/health-alerts` | Worker heartbeat, Ollama, nodes offline |
| Hourly | `/api/cron/contributor-ops` | Stale fetches, payouts, delivery retries |
| Daily 02:00 UTC | `/api/cron/scheduled-exports` | Batch NDJSON exports per org schedule |

---

## Remaining (post–Phase 2)

See [PHASE3_ROADMAP.md](./PHASE3_ROADMAP.md) — job splitting, push dispatch, dual-node consensus, enterprise ops (Redis rate limiting, log drain).

### Edge GPU inference ✅

Contributors with **Enable GPU inference** and ≥4GB NVIDIA VRAM run local Ollama (`qwen2.5:3b-instruct-q4_K_M` default) on the edge node after fetch. Parsed JSON is sent to the hub; hub skips central Ollama when `fetch_tasks.edge_inference = true`.

Node env (optional):

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b-instruct-q4_K_M
```

Migration `20260701000026_edge_gpu_inference.sql`.

---

### Razorpay test checkout

1. Use **Test Mode** keys from Razorpay Dashboard
2. `/dashboard/credits` → select pack → **Pay with Razorpay**
3. Test UPI: `success@razorpay` · Test card: `4111 1111 1111 1111`, any future expiry, CVV 123
4. Webhook (optional): point to `https://your-host/api/payments/razorpay/webhook` with `payment.captured` event

### RazorpayX contributor payouts

1. Enable RazorpayX on your Razorpay account and copy **Customer Identifier / Account Number**
2. Set `RAZORPAYX_ACCOUNT_NUMBER` (same API keys as Razorpay)
3. Webhook: `https://your-host/api/payments/razorpayx/webhook` — events `payout.processed`, `payout.failed`, `payout.reversed`
4. Contributor adds UPI in `/contributor/setup`
5. When balance ≥ ₹500, `/admin/payouts` → **Send UPI**

---

## Persona boundaries (unchanged)

- Landing page does **not** market contributor earnings or UPI
- Contributor access via login footer link only when Phase 2 enabled
- Buyer dashboard shows Credits nav only when Phase 2 enabled

---

## Production hardening

See [PRODUCTION.md](./PRODUCTION.md) — security headers, API rate limits, tiered health checks, env validation.

---

*July 2026*
