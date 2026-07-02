-- job.failed webhooks + event_type on delivery log

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS webhook_notify_failed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE job_delivery_log
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'job.completed'
    CHECK (event_type IN ('job.completed', 'job.failed'));

ALTER TABLE job_delivery_log
  DROP CONSTRAINT IF EXISTS job_delivery_log_job_id_channel_key;

ALTER TABLE job_delivery_log
  DROP CONSTRAINT IF EXISTS job_delivery_log_job_channel_event_key;

ALTER TABLE job_delivery_log
  ADD CONSTRAINT job_delivery_log_job_channel_event_key
  UNIQUE (job_id, channel, event_type);

DROP INDEX IF EXISTS idx_job_delivery_pending;

CREATE INDEX IF NOT EXISTS idx_job_delivery_retry
  ON job_delivery_log (status, created_at)
  WHERE status IN ('pending', 'failed');

CREATE OR REPLACE FUNCTION enqueue_job_webhook_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO job_delivery_log (job_id, organization_id, channel, event_type, status)
    VALUES (NEW.id, NEW.organization_id, 'webhook', 'job.completed', 'pending')
    ON CONFLICT (job_id, channel, event_type) DO NOTHING;
  END IF;

  IF NEW.status = 'failed' AND (OLD.status IS DISTINCT FROM 'failed') THEN
    INSERT INTO job_delivery_log (job_id, organization_id, channel, event_type, status)
    VALUES (NEW.id, NEW.organization_id, 'webhook', 'job.failed', 'pending')
    ON CONFLICT (job_id, channel, event_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
