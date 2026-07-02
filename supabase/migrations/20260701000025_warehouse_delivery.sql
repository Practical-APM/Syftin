-- Snowflake / BigQuery row loads on job completion

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS warehouse_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warehouse_provider TEXT
    CHECK (warehouse_provider IS NULL OR warehouse_provider IN ('snowflake', 'bigquery')),
  ADD COLUMN IF NOT EXISTS snowflake_account TEXT,
  ADD COLUMN IF NOT EXISTS snowflake_warehouse TEXT,
  ADD COLUMN IF NOT EXISTS snowflake_database TEXT,
  ADD COLUMN IF NOT EXISTS snowflake_schema TEXT NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS snowflake_table TEXT,
  ADD COLUMN IF NOT EXISTS snowflake_user_enc TEXT,
  ADD COLUMN IF NOT EXISTS snowflake_password_enc TEXT,
  ADD COLUMN IF NOT EXISTS bq_project_id TEXT,
  ADD COLUMN IF NOT EXISTS bq_dataset TEXT,
  ADD COLUMN IF NOT EXISTS bq_table TEXT,
  ADD COLUMN IF NOT EXISTS bq_credentials_enc TEXT;

ALTER TABLE job_delivery_log
  DROP CONSTRAINT IF EXISTS job_delivery_log_channel_check;

ALTER TABLE job_delivery_log
  ADD CONSTRAINT job_delivery_log_channel_check
  CHECK (channel IN ('webhook', 'bucket', 'sftp', 'warehouse'));

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

    INSERT INTO job_delivery_log (job_id, organization_id, channel, event_type, status)
    VALUES (NEW.id, NEW.organization_id, 'sftp', 'job.completed', 'pending')
    ON CONFLICT (job_id, channel, event_type) DO NOTHING;

    INSERT INTO job_delivery_log (job_id, organization_id, channel, event_type, status)
    VALUES (NEW.id, NEW.organization_id, 'warehouse', 'job.completed', 'pending')
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
