# Pilot end-to-end test (local)

Run this checklist on your Mac before inviting a design partner. Assumes Phase 1 central worker on the same machine.

---

## 1. Prerequisites

```bash
# Ollama + model
ollama pull qwen2.5:3b-instruct-q4_K_M

# Go 1.22+ (worker)
go version
```

Apply all Supabase migrations through `20260701000008_job_cancelled_status.sql` in the SQL editor or via CLI.

---

## 2. Environment

### Web — `web/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Local dev (open dashboard without login)
NEXT_PUBLIC_AUTH_REQUIRED=false
NEXT_PUBLIC_SHOW_DEV_SETUP=true

# Optional: skip login in prod-like test
# PLATFORM_ADMIN_EMAILS=you@syftin.io
# PILOT_INVITE_EMAILS=pilot@company.com

OLLAMA_BASE_URL=http://localhost:11434
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Worker — `worker/.env`

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b-instruct-q4_K_M
```

---

## 3. Start services

Terminal 1 — web:

```bash
cd web && npm run dev
```

Terminal 2 — worker:

```bash
cd worker && go run ./cmd/worker
```

Terminal 3 — health check:

```bash
curl -s http://localhost:3000/api/health | jq
```

Expect `supabase: true`, `ollama: true`, and worker heartbeat after ~30s.

---

## 4. Buyer flow (Persona A)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `http://localhost:3000/login` | Sign-in or request access |
| 2 | Go to `/dashboard` | Overview or Welcome onboarding |
| 3 | If `AUTH_REQUIRED=true`: accept DPA gate | Jobs unlocked |
| 4 | `/dashboard/compliance` | See approved domains |
| 5 | `/dashboard/jobs/new` | Create job (e.g. `naukri.com` + schema) |
| 6 | Job detail page | Status: queued → processing → validating → completed |
| 7 | Download JSON | File from job detail or `/dashboard/exports` |
| 8 | Preview panel | First 3 records; retry works if error |

**Demo mode** (no Supabase): jobs auto-complete in ~8s with sample compliance score.

---

## 5. Admin flow (Persona C)

Set `PLATFORM_ADMIN_EMAILS=your@email.com` and sign in, or use dev mode with empty admin list (allows all in dev).

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/admin` | Platform status, job counts |
| 2 | `/admin/organizations` | Workspaces + DPA; **Manage** opens per-org domain subset |
| 3 | `/admin/invites` | Add invite; waitlist section in demo mode |
| 4 | `/admin/domains` | Manage global platform whitelist |
| 5 | `/admin/benchmarks` | Report after `bash worker/scripts/run-benchmarks.sh` |

---

## 6. Waitlist (demo only)

1. Unset Supabase keys in `web/.env.local` (or use fresh env without client keys).
2. Submit email on `/login` → stored via `POST /api/waitlist`.
3. Re-enable Supabase + admin → `/admin/invites` → **Early access waitlist** → **Add to invites**.

---

## 7. Failure recovery

| Issue | Fix |
|-------|-----|
| Job stuck in `queued` | Worker not running; check `/api/health` |
| Job `failed` | Open job detail → read error → **Retry job** |
| Ollama false | `ollama serve` + model pulled |
| Domain rejected | Add domain in `/admin/domains`; or enable for workspace under `/admin/organizations` → Manage |
| Realtime banner | Refresh page; polling still works in demo mode |

---

## 8. Production pilot

Before external users:

1. `NEXT_PUBLIC_AUTH_REQUIRED=true`
2. Pilot email in `pilot_invites` or `PILOT_INVITE_EMAILS`
3. `PLATFORM_ADMIN_EMAILS` set for ops team
4. Worker deployed with heartbeat (see [DEPLOY.md](./DEPLOY.md))
5. Run step 4 once on staging with a real domain

---

*Syftin Phase 1 — July 2026*
