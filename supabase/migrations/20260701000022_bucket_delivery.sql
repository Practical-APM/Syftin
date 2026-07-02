-- S3 / GCS bucket push on job completion

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS bucket_push_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bucket_provider TEXT
    CHECK (bucket_provider IS NULL OR bucket_provider IN ('s3', 'gcs')),
  ADD COLUMN IF NOT EXISTS bucket_name TEXT,
  ADD COLUMN IF NOT EXISTS bucket_region TEXT,
  ADD COLUMN IF NOT EXISTS bucket_prefix TEXT NOT NULL DEFAULT 'syftin/',
  ADD COLUMN IF NOT EXISTS bucket_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS bucket_access_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS bucket_secret_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS gcs_project_id TEXT,
  ADD COLUMN IF NOT EXISTS gcs_credentials_enc TEXT;

ALTER TABLE job_delivery_log
  DROP CONSTRAINT IF EXISTS job_delivery_log_channel_check;

ALTER TABLE job_delivery_log
  ADD CONSTRAINT job_delivery_log_channel_check
  CHECK (channel IN ('webhook', 'bucket'));

CREATE OR REPLACE FUNCTION enqueue_job_webhook_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO job_delivery_log (job_id, organization_id, channel, event_type, status)
    VALUES (NEW.id, NEW.organization_id, 'webhook', 'job.completed', 'pending')
    ON CONFLICT (job_id, channel, event_type) DO NOTHING;

    INSERT INTO job_delivery_log (job_id, organization_id, channel, event_type, status)
    VALUES (NEW.id, NEW.organization_id, 'bucket', 'job.completed', 'pending')
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
