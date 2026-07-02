# Syftin

Distributed edge-intelligence platform for enterprise web data extraction.

## Local setup (MacBook M2)

This project is configured for **local development without cloud LLM APIs or residential proxies**:

- **LLM:** Ollama with `qwen2.5:3b-instruct-q4_K_M` (Metal on Apple Silicon)
- **Fetch:** Playwright (headless Chromium) with HTTP fallback in `auto` mode
- **Domains:** Dynamic whitelist managed in the dashboard

### 1. Install Ollama + pull Qwen

```bash
# Install from https://ollama.com then:
ollama pull qwen2.5:3b-instruct-q4_K_M

# Recommended for M2 (matches spec)
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_GPU_DRIVER=metal
```

### 2. Web dashboard

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

- Landing: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Add domains: http://localhost:3000/dashboard/compliance

### 3. Supabase (optional but recommended)

Run migrations in `supabase/migrations/` including `20260701000003_flexible_whitelist.sql`.

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Without Supabase, the app runs in demo mode with an in-memory domain whitelist.

**Readiness score:** see [READINESS.md](./READINESS.md) (currently **83/100** — pilot-ready with admin console).

**Pilot deployment:** see [DEPLOY.md](./DEPLOY.md).

### 4. Go worker

Requires Go 1.22+.

```bash
cd worker
cp .env.example .env
go mod tidy

# One-time: install headless Chromium for Playwright
bash scripts/install-playwright.sh

go run ./cmd/worker
```

Worker flow: poll queued jobs → fetch (HTTP or Playwright) → **close browser** → strip HTML to text → parse with Ollama → PII scrub → schema validate → save results.

**Fetch modes** (`FETCH_MODE` in `worker/.env`):

| Mode | Behavior |
|------|----------|
| `auto` (default) | Fast HTTP first; Playwright if page text is too short (JS-heavy sites) |
| `playwright` | Always render with headless Chromium |
| `http` | HTTP only (no browser) |

### 5. Contributor edge node (Phase 2)

Students and homelab operators earn from approved public-page fetches. **No Supabase keys required on their laptop.**

```bash
# From /contributor/download — copy the one-liner with your token:
curl -fsSL "http://localhost:3000/install-node.sh" | bash -s -- \
  --token sftn_... --api http://localhost:3000
```

Portal: http://localhost:3000/contributor · Help: `/contributor/help`

See [docs/CONTRIBUTOR_PORTAL.md](./docs/CONTRIBUTOR_PORTAL.md).

**Release binaries:** `cd worker && make release-node` or tag `v*` on GitHub.

## V1 readiness checklist

Use this to confirm the full loop works on your machine:

| Step | Check |
|------|-------|
| 1 | `ollama pull qwen2.5:3b-instruct-q4_K_M` succeeds |
| 2 | `bash worker/scripts/install-playwright.sh` installs Chromium |
| 3 | `web/.env.local` has Supabase keys; migrations applied |
| 4 | `worker/.env` has matching `SUPABASE_URL` + service role key |
| 5 | Dashboard setup banner shows Supabase + Ollama green (visit `/dashboard`) |
| 6 | Go worker starts without error and logs `ollama model ... ready` |
| 7 | Create a job on an approved domain (`/dashboard/jobs/new`) |
| 8 | Job moves: In queue → Collecting data → Checking quality → Ready to download |
| 9 | Worker log shows `via playwright` for JS-heavy sites (e.g. naukri.com) |
| 10 | Download JSON from job detail or `/dashboard/exports` |

**Demo mode (no Supabase):** Jobs simulate progress locally (~8 seconds) and produce a sample JSON file shaped like your schema. Real website fetching requires Supabase + the Go worker.

**Health check:** `GET /api/health` reports Supabase and Ollama status.

## Features

| Feature | Detail |
|---------|--------|
| Local Qwen via Ollama | No OpenAI/Anthropic keys required |
| Playwright fetch | Headless Chromium for JS-heavy sites (auto fallback) |
| Direct local fetch | No proxy; uses your Mac's connection |
| Dynamic domain whitelist | Add/remove domains in Compliance UI |
| Input sanitization | Blocks illegal/NSFW terms in job inputs |
| Realtime job updates | Supabase Realtime on `jobs` table |
| Setup guidance | Dashboard banner when services are missing |
| Failed job errors | Error message shown on job detail page |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Supabase, Ollama, and worker readiness |
| GET | `/api/benchmarks` | Latest domain compliance benchmark report |
| GET/POST | `/api/jobs` | List / create jobs |
| GET | `/api/jobs/[id]/result` | Download JSON result |
| GET/POST/DELETE | `/api/domains` | Manage whitelist |

## Repository structure

```
projectS/
├── web/                  # Next.js dashboard + landing
├── worker/               # Go worker (Ollama + local fetch)
├── supabase/migrations/
├── PRODUCT.md
└── DESIGN.md
```
