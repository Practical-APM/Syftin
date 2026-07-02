-- Scheduled batch exports (daily / weekly NDJSON bundles)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS export_schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS export_schedule_frequency TEXT
    CHECK (export_schedule_frequency IS NULL OR export_schedule_frequency IN ('daily', 'weekly')),
  ADD COLUMN IF NOT EXISTS export_schedule_channel TEXT
    CHECK (export_schedule_channel IS NULL OR export_schedule_channel IN ('bucket', 'sftp')),
  ADD COLUMN IF NOT EXISTS export_schedule_last_run_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS export_batch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'skipped')),
  job_count INTEGER NOT NULL DEFAULT 0,
  object_path TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_batch_log_org
  ON export_batch_log (organization_id, created_at DESC);
