-- Phase 4 Sprint 1: Per-event webhook subscriptions
-- Allows orgs to register multiple webhook endpoints, each filtered to specific event types.

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT,
  -- events: comma-separated or stored as array of: job.completed, job.failed,
  -- batch.completed, batch.shard_failed, batch.cancelled, credit.low
  events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  -- delivery tracking
  last_triggered_at TIMESTAMPTZ,
  last_status INTEGER,  -- last HTTP response status
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subs_org
  ON webhook_subscriptions (organization_id, enabled);

CREATE INDEX IF NOT EXISTS idx_webhook_subs_event
  ON webhook_subscriptions USING GIN (events);

-- Delivery log for subscription-based webhooks (separate from job_delivery_log)
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  reference_id TEXT,           -- job_id, batch_id, or org_id depending on event
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | delivered | failed | skipped
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_sub
  ON webhook_delivery_log (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_org
  ON webhook_delivery_log (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_pending
  ON webhook_delivery_log (status, attempt_count)
  WHERE status IN ('pending', 'failed');

-- Credit low-balance threshold per org (triggers credit.low event)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS credit_low_threshold_paise BIGINT DEFAULT 500;

-- Track SLA tier per org
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sla_tier TEXT NOT NULL DEFAULT 'standard'
  CHECK (sla_tier IN ('standard', 'enterprise', 'premium'));
