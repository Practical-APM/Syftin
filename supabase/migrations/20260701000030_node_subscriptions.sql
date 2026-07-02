-- Phase 3: Push Dispatch (SSE)
-- Track node online status and domain preferences/affinity for SSE dispatch

CREATE TABLE IF NOT EXISTS node_subscriptions (
  node_id UUID PRIMARY KEY REFERENCES contributor_nodes(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'scout',
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_success_domain TEXT,
  last_ping_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_node_subscriptions_online 
  ON node_subscriptions (is_online, tier, last_ping_at DESC);

-- Trigger to update updated_at on node_subscriptions
CREATE OR REPLACE FUNCTION update_node_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_node_subscriptions_updated_at ON node_subscriptions;
CREATE TRIGGER trg_update_node_subscriptions_updated_at
  BEFORE UPDATE ON node_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_node_subscriptions_updated_at();

-- Update existing telemetry ping logic to update last_ping_at?
-- Handled at application layer.
