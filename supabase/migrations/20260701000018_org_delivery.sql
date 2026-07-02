-- Buyer data delivery: webhooks, API keys, delivery audit log

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_include_data BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
  ADD COLUMN IF NOT EXISTS api_key_prefix TEXT,
  ADD COLUMN IF NOT EXISTS default_export_format TEXT NOT NULL DEFAULT 'json'
    CHECK (default_export_format IN ('json', 'csv', 'ndjson'));

CREATE TABLE IF NOT EXISTS job_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('webhook')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'failed', 'skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  response_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  UNIQUE (job_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_job_delivery_pending
  ON job_delivery_log (status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_job_delivery_org
  ON job_delivery_log (organization_id, created_at DESC);

-- Enqueue webhook delivery when a job completes
CREATE OR REPLACE FUNCTION enqueue_job_webhook_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO job_delivery_log (job_id, organization_id, channel, status)
    VALUES (NEW.id, NEW.organization_id, 'webhook', 'pending')
    ON CONFLICT (job_id, channel) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enqueue_job_delivery ON jobs;
CREATE TRIGGER trg_enqueue_job_delivery
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_job_webhook_delivery();
