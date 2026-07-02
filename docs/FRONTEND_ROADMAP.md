# Syftin Frontend Roadmap

Persona boundaries: [user-personas.md](../user-personas.md)

Phase 2 detail: [PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md)

---

## Phase 1 completed

### Buyer dashboard (`/dashboard`)
- Full shell, DPA gate, session strip, sign out, retry jobs, cancel active jobs
- Variance flags on job detail, Help → `/docs`
- Realtime status banner when live updates pause

### Platform admin (`/admin`) — Persona C
- Overview, Workspaces (DPA audit), invites, whitelist, benchmarks
- Gated by `PLATFORM_ADMIN_EMAILS`
- API error states with retry on admin panels

### Buyer knowledge base (`/docs`)
- Workflow, schema examples, troubleshooting

### Resilience
- `error.tsx` on dashboard and admin routes
- `loading.tsx` skeletons on dashboard and admin
- Inline error + retry on admin API panels
- Waitlist persistence (`/api/waitlist`) in demo mode

---

## Phase 2 (completed)

| Item | Status |
|------|--------|
| Contributor portal (`/contributor`) | ✅ Full onboarding, install wizard, help |
| Edge node worker (`cmd/node`) | ✅ API auth, sysinfo, metered detect |
| One-line installer + Playwright packaging | ✅ `/install-node.sh`, `/releases/` |
| Distributed fetch tasks | ✅ + stale claim reclaim |
| Buyer credits UI + Razorpay | ✅ |
| Admin payout approval + RazorpayX | ✅ + optional auto-disburse |
| Contributor fleet admin | ✅ `/admin/contributors` |
| Per-org domain whitelist | ✅ Admin workspaces + buyer compliance |
| Benchmark reports in Supabase | ✅ |
| Contributor invite admin | ✅ |
| Buyer data delivery (API, webhooks, bucket, SFTP, warehouse, batches) | ✅ |
| Contributor resource autonomy | ✅ |
| Edge GPU inference (local Ollama on nodes) | ✅ |

---

## Remaining (post–Phase 2)

- Enterprise ops: Redis rate limiting, log drain

---

## Optional / future

- ~~Structured logging + alerting on worker heartbeat miss~~ ✅ (5-min health cron, Slack/webhook, DB cooldown)

---

*Last updated: July 2026*
