# Phase 3 — Fleet scale, job orchestration & fair economics

Phase 3 closes the gap between the **product vision** (buyer request → fleet → tiered work → transparent revenue split) and what Phase 2 ships today (1 job → 1 fetch task → pull queue → hub validation).

**Prerequisite:** Phase 2 complete through migration `20260701000027_revenue_share.sql` (70% contributor share, tier multipliers, platform ledger).

---

## Current state (Phase 2)

| Area | Today |
|------|--------|
| Job fan-out | 1 buyer job → 1 `fetch_tasks` row → 1 contributor claims |
| Dispatch | Pull queue (nodes poll `/api/node/tasks/claim`) |
| Edge work | HTTP fetch + optional local Ollama parse |
| Hub work | Validation, extraction fallback, delivery |
| Buyer price | ₹5/job (`DEFAULT_JOB_COST_CENTS` / `JOB_PRICE_PAISE`) |
| Contributor pay | 70% base share × tier (Scout 1×, Ranger 1.25×, Titan 1.5×) + 25% GPU bonus |
| Platform margin | Recorded in `platform_ledger` on job completion |

---

## Phase 3 goals

### 1. Job splitting & batch orchestration

**Problem:** Large buyer requests (100 URLs, category crawls) are still one job with one fetch.

**Build:**
- `job_batches` / `job_shards` — parent job + N child fetch tasks
- API: buyer submits URL list or crawl spec → hub creates shard plan
- Progress: parent job status = aggregate of children
- Credits: charge once per parent or per shard (configurable)
- Delivery: merge shard results before webhook/bucket export

### 2. Dedicated processing tier

**Problem:** Fetch and LLM extraction are conflated on edge vs hub.

**Build:**
- Task types: `fetch`, `parse`, `validate`, `enrich`
- Ranger/Titan nodes can opt into **parse-only** queue (GPU inference without fetch)
- Hub worker focuses on validation, consensus, and delivery
- Separate `reward_paise` curves per task type in `economics.ts`

### 3. Smarter dispatch (push + locality)

**Problem:** Pure polling wastes latency; no geographic or domain affinity.

**Build:**
- Optional WebSocket / SSE push to online nodes when tasks match tier + domain
- Domain affinity: prefer nodes that recently succeeded on same domain
- Stale-claim reclaim (already exists) + priority lanes for paid tiers
- Contributor “available capacity” signal from resource telemetry

### 4. Revenue split engine (full transparency)

**Problem:** Phase 2 fixes the 10% contributor injustice; enterprise buyers need audit trails.

**Build:**
- Admin dashboard: `platform_ledger` per org / per day
- Multi-contributor jobs: split payout across fetch + parse contributors
- Refunds / partial credits on failed shards
- Exportable settlement report (CSV) for finance

### 5. Quality & consensus

**Problem:** Single-node fetch has no cross-check.

**Build:**
- Dual-node validation for high-value domains (spec: two scouts must agree)
- Hub arbitration on mismatch
- Reputation score affects claim priority (not payout rate initially)

### 6. Enterprise ops

From `READINESS.md`:
- Redis-backed rate limiting
- Log drain to object storage
- Multi-region hub workers
- SLA tiers (buyer-facing)

---

## Suggested migration order

| # | Migration theme |
|---|-----------------|
| 028 | `job_batches`, `parent_job_id` on jobs |
| 029 | Task type enum on `fetch_tasks` |
| 030 | `platform_ledger` RLS + admin views |
| 031 | Push notification channel (node subscriptions) |
| 032 | Dual-node consensus flags |

---

## Persona boundaries (unchanged)

- Landing page: buyer value prop; no contributor payout marketing
- Contributor earnings / capacity estimator: `/contributor/download` and contributor portal only
- Economics constants: `web/src/lib/contributor/economics.ts`

---

## Success metrics

- Median time-to-first-byte for buyer job ↓ 40% vs pure poll
- Contributor earnings ≥ 65% of buyer job price on average (incl. tier mix)
- Platform ledger reconciles to credit_transactions within ₹0.01/job
- 95% of multi-URL jobs complete with partial failure reporting
