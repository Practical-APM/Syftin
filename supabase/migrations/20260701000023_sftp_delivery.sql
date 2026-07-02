-- SFTP drop on job completion

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sftp_push_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sftp_host TEXT,
  ADD COLUMN IF NOT EXISTS sftp_port INTEGER NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS sftp_username TEXT,
  ADD COLUMN IF NOT EXISTS sftp_auth_method TEXT
    CHECK (sftp_auth_method IS NULL OR sftp_auth_method IN ('password', 'private_key')),
  ADD COLUMN IF NOT EXISTS sftp_password_enc TEXT,
  ADD COLUMN IF NOT EXISTS sftp_private_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS sftp_remote_path TEXT NOT NULL DEFAULT '/syftin/';

ALTER TABLE job_delivery_log
  DROP CONSTRAINT IF EXISTS job_delivery_log_channel_check;

ALTER TABLE job_delivery_log
  ADD CONSTRAINT job_delivery_log_channel_check
  CHECK (channel IN ('webhook', 'bucket', 'sftp'));

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
  END IF;

  IF NEW.status = 'failed' AND (OLD.status IS DISTINCT FROM 'failed') THEN
    INSERT INTO job_delivery_log (job_id, organization_id, channel, event_type, status)
    VALUES (NEW.id, NEW.organization_id, 'webhook', 'job.failed', 'pending')
    ON CONFLICT (job_id, channel, event_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
