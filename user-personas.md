# Syftin User Personas & Phase Alignment

This document describes **three personas** and their journeys. Phase 1 implements **Persona A** (buyer). **Persona B** (contributor network) is available when `NEXT_PUBLIC_PHASE2_ENABLED=true`. **Persona C** ops tooling is partial.

See also: [PRODUCT.md](./PRODUCT.md) · [READINESS.md](./READINESS.md) · [docs/CONTRIBUTOR_PORTAL.md](./docs/CONTRIBUTOR_PORTAL.md) · [docs/FRONTEND_ROADMAP.md](./docs/FRONTEND_ROADMAP.md)

---

## 1. Persona directory

```
                    SYFTIN HUB
                         |
         +---------------+---------------+
         |               |               |
  Enterprise Buyer   Worker Node    Platform Admin
  (Persona A)        (Persona B)    (Persona C)
  Phase 1 ✅         Phase 2 ✅     Partial ✅
```

| Persona | Who | Mindset | Phase 1 surface |
|---------|-----|---------|-----------------|
| **A — Enterprise Buyer** | Data ops, AI founders, e-commerce leads | Reliable schema-accurate data, zero compliance headaches | `/dashboard` |
| **B — Worker Node** | Friends/students with idle laptops | Simple background app, UPI payouts, no data cap drain | `/contributor` (Phase 2) |
| **C — Platform Admin** | Syftin engineering & ops | Protect platform, monitor health, enforce whitelist, settlements | `/admin` + `/api/health` |

---

## 2. Journey maps vs implementation

### Journey 1 — Enterprise Buyer (Persona A)

| Step | Persona doc | Phase 1 status | Where |
|------|-------------|----------------|-------|
| Log into dashboard | Magic link / invite | ✅ | `/login` → `/dashboard` |
| Select approved domain + paste JSON schema | Hard whitelist + example fields | ✅ | `/dashboard/jobs/new` |
| Accept DPA before jobs | *(implied compliance)* | ✅ | `PilotSetupGate` |
| Prepay credit ledger | Credit card → `credits` table | ✅ Razorpay | `/dashboard/credits` |
| Launch extraction run | Micro-tasks → worker nodes | ✅ *simplified* | Single central Go worker polls `jobs` |
| Real-time progress | Dashboard telemetry | ✅ | Supabase Realtime + job detail |
| Download JSON, CSV, or NDJSON | Unified export + API | ✅ | `/dashboard/exports`, `/dashboard/integrations`, `/api/v1/jobs` |
| Retry failed job | *(ops recovery)* | ✅ | Job detail + `/api/jobs/[id]/retry` |
| Cancel active job | *(wrong URL/schema)* | ✅ | Job detail + `/api/jobs/[id]/cancel` |

**Phase 1 simplifications (intentional, not spillovers):**

- One **central worker** (your Mac/VM), not distributed Persona B nodes
- Jobs go to `queued` immediately — no `PENDING_FUNDS` gate
- **JSON export default** — CSV and NDJSON also available via dashboard, API, and webhooks
- Buyer **views** approved sites; Syftin **maintains** the whitelist in production

---

### Journey 2 — Worker Node (Persona B)

| Step | Persona doc | Status | Where |
|------|-------------|--------|-------|
| One-line install (no code) | Contributor onboarding | ✅ | `/contributor/download`, `install-node.sh` |
| Hardware profiling → task tier | Auto-detect on node startup | ✅ | `worker/internal/sysinfo`, `/api/node/register` |
| Poll tasks, fetch HTML in RAM | Distributed fetch | ✅ | `cmd/node` + `fetch_tasks` |
| Mobile hotspot / metered pause | Network safeguard | ✅ | `/contributor/network` + node auto-detect |
| Earnings + UPI payout ≥ ₹500 | RazorpayX | ✅ | `/contributor/earnings`, `/admin/payouts` |
| Self-serve help & walkthroughs | Zero support tickets | ✅ | `/contributor/help` |

**No spillover:** Landing page, dashboard, and marketing copy do **not** mention UPI, contributor earnings, or residential nodes.

---

### Journey 3 — Platform Admin (Persona C)

| Step | Persona doc | Phase 1 status | Where |
|------|-------------|----------------|-------|
| Monitor node health & worker count | Fleet telemetry | ✅ | `/admin`, `/api/health`, `worker_heartbeats` |
| Review schema accuracy / drift | Benchmarks | ✅ | `/admin/benchmarks` |
| Maintain global domain whitelist | Block unauthorized URLs | ✅ | `/admin/domains` |
| Manage pilot buyer invites | Onboard Persona A | ✅ | `/admin/invites` |
| Audit PII redaction | Edge filters before storage | ✅ | `worker/internal/extract/pii.go` |
| Approve payout batches | RazorpayX webhooks | ✅ | `/admin/payouts` |

---

## 3. Atomic action matrix

| Persona | Action | Phase 1 execution | Data target |
|---------|--------|-------------------|-------------|
| **Buyer** | Select domain + paste JSON | Whitelist + sanitize validation | `jobs` → `queued` |
| **Buyer** | Authorize credit deposit | Razorpay checkout | `credit_transactions` + balance |
| **Buyer** | Trigger job run | Worker claims from queue | `jobs.status` → `processing` |
| **Buyer** | Download export | JSON / CSV / NDJSON | Dashboard, `/api/v1/jobs`, webhooks |
| **Worker** | System setup / profiling | Auto-detect tier + fetch mode | `contributor_nodes.capabilities` |
| **Worker** | Poll & fetch | Edge node (`cmd/node`) | `fetch_tasks` |
| **Worker** | PII filter + submit chunk | Regex redaction in pipeline | Output JSON |
| **Worker** | Request cash-out | RazorpayX at ₹500 threshold | `payout_events` trigger |
| **Admin** | Add domain to whitelist | Dev flag or Supabase direct | `domain_whitelist` |
| **Admin** | Approve payout batch | RazorpayX UPI or manual | `payout_events` |

---

## 4. Spillover checklist (verified)

| Risk | Status |
|------|--------|
| Buyer UI promises UPI / contributor earnings | ✅ None |
| Buyer can mutate global whitelist in production | ✅ Fixed — read-only; platform admin uses `/admin/domains` |
| Benchmarks visible to pilot customers | ✅ Fixed — `/admin/benchmarks` only; dev shortcut remains |
| Landing promises CSV export | ✅ Supported (JSON, CSV, NDJSON) |
| Landing promises distributed / residential fetch | ✅ None — “local LLM”, central worker |
| Persona B routes (`/contributor`) | ✅ Gated by `NEXT_PUBLIC_PHASE2_ENABLED` |
| DPA / data-controller framing | ✅ DPA gate + `/dpa` page |
| PII redaction before download | ✅ Worker pipeline |
| Credit prepay blocking job creation | ✅ Not enforced (Phase 2) — jobs queue immediately |

---

## 5. Environment flags (persona boundaries)

| Variable | Effect |
|----------|--------|
| `NEXT_PUBLIC_AUTH_REQUIRED=true` | Persona A must sign in (pilot) |
| `PILOT_INVITE_EMAILS` | Invite-only Persona A onboarding |
| `PLATFORM_ADMIN_EMAILS` | Persona C access to `/admin` (comma-separated) |
| `NEXT_PUBLIC_SHOW_DEV_SETUP=true` | Persona C dev checklist in dashboard |
| `NEXT_PUBLIC_ALLOW_DOMAIN_WRITE=true` | Persona C whitelist writes from UI (local dev default) |

---

*Last aligned: July 2026 — Phase 1 pilot (READINESS 81/100)*
