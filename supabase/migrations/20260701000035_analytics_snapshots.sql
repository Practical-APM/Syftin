-- Phase 4 Sprint 3: Analytics snapshots for admin observability
-- Pre-aggregates daily metrics to power fast chart queries.

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  -- metric_type values:
  --   'node_count'         → dimensions: {}         → value: online node count
  --   'fetch_latency_p50'  → dimensions: {domain}   → value: median ms
  --   'fetch_latency_p95'  → dimensions: {domain}   → value: 95th pctile ms
  --   'domain_failure_rate'→ dimensions: {domain}   → value: % (0-100)
  --   'credit_burn'        → dimensions: {org_id}   → value: paise spent
  --   'batch_throughput'   → dimensions: {}         → value: shards completed
  dimensions JSONB NOT NULL DEFAULT '{}',
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date, metric_type, dimensions)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date
  ON analytics_snapshots (snapshot_date DESC, metric_type);

-- API key scopes and usage tracking (Sprint 4 prep — added here to allow FK)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS api_key_scope TEXT NOT NULL DEFAULT 'read_write'
  CHECK (api_key_scope IN ('read_only', 'read_write', 'admin', 'demo')),
  ADD COLUMN IF NOT EXISTS api_key_last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_key_usage_count BIGINT NOT NULL DEFAULT 0;
