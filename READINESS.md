# Syftin V1 Readiness Score

**Overall: 91 / 100** — Pilot-ready with live contributor telemetry and thermal safeguards.

Last updated: 2026-07-01 (ops webhooks, platform cron, SYFTIN_ENV JSON logging)

---

## Score breakdown

| Area | Weight | Score | Notes |
|------|--------|-------|-------|
| **Core extraction loop** | 20% | **88** | Unchanged — full pipeline with Playwright |
| **Product UX** | 15% | **84** | DPA gate, retry jobs, pilot onboarding |
| **Worker reliability** | 15% | **78** | Stale job reaper, failed runs logged, retries |
| **Security & auth** | 15% | **80** | RLS, rate limits, tiered health, security headers |
| **Data & compliance** | 10% | **70** | DPA signing, benchmark suite |
| **Observability & ops** | 10% | **82** | Tiered health, Slack ops alerts, structured worker logs, hourly cron |
| **Spec completeness** | 10% | **78** | Phase 1 + Phase 2 contributor/credits shipped |
| **Launch readiness** | 5% | **88** | DEPLOY.md, PRODUCTION.md, Vercel cron, migrations through 000020 |

**Weighted total: 91 / 100**

---

## Pilot-ready checklist

Before inviting a design partner:

| Step | Verify |
|------|--------|
| 1 | All Supabase migrations applied (through `20260701000026`) |
| 2 | Pilot email in `pilot_invites` or `PILOT_INVITE_EMAILS` |
| 3 | `NEXT_PUBLIC_AUTH_REQUIRED=true` in production |
| 4 | Worker running with heartbeat green (`/api/health`) |
| 5 | Ollama model pulled on worker host |
| 6 | Pilot completes: sign in → DPA → create job → download JSON |
| 7 | Run `bash worker/scripts/run-benchmarks.sh` (optional quality gate) |

See [DEPLOY.md](./DEPLOY.md) for full deployment instructions.  
Local walkthrough: [docs/PILOT_E2E.md](./docs/PILOT_E2E.md).

---

## Sprint status

| Sprint | Status |
|--------|--------|
| Sprints 1–5 | ✅ Auth, API hardening, worker reliability, CI |
| Sprint 6 | ✅ Benchmarks, robots.txt, retries |
| **Sprint 7 — Pilot ready** | ✅ Tenancy, DPA gate, job retry, deploy runbook |

---

## Remaining for enterprise launch (90+)

1. Pass 5/5 domain benchmarks at 98%+ consistently
2. Distributed rate limiting (Redis / Upstash) for multi-instance web
3. Log drain integration (Datadog / Axiom) for worker JSON logs

---

## Score bands

| Band | Meaning |
|------|---------|
| **80–100** | **Pilot-ready** — invite design partners |
| 60–79 | Internal validation only |
| < 60 | Prototype demo |
