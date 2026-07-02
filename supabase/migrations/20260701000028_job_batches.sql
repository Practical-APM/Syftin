-- Phase 3: Job batches (multi-URL orchestration)

CREATE TABLE IF NOT EXISTS job_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_shards INTEGER NOT NULL DEFAULT 0,
  completed_shards INTEGER NOT NULL DEFAULT 0,
  failed_shards INTEGER NOT NULL DEFAULT 0,
  status job_status NOT NULL DEFAULT 'pending',
  batch_pricing TEXT NOT NULL DEFAULT 'per_shard'
    CHECK (batch_pricing IN ('per_shard', 'per_batch')),
  example_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_batches_org
  ON job_batches (organization_id, created_at DESC);

-- Link child jobs to parent batch
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parent_batch_id UUID
  REFERENCES job_batches(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shard_index INTEGER;

CREATE INDEX IF NOT EXISTS idx_jobs_parent_batch
  ON jobs (parent_batch_id) WHERE parent_batch_id IS NOT NULL;

-- Aggregate child job status changes to parent batch
CREATE OR REPLACE FUNCTION update_batch_on_job_status()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_id UUID;
  v_total INTEGER;
  v_completed INTEGER;
  v_failed INTEGER;
  v_new_status job_status;
BEGIN
  v_batch_id := NEW.parent_batch_id;
  IF v_batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT total_shards INTO v_total
  FROM job_batches WHERE id = v_batch_id;

  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_completed, v_failed
  FROM jobs WHERE parent_batch_id = v_batch_id;

  -- Determine batch status from children
  IF v_completed + v_failed >= v_total THEN
    IF v_failed > 0 AND v_completed = 0 THEN
      v_new_status := 'failed';
    ELSE
      v_new_status := 'completed';
    END IF;
  ELSIF v_completed > 0 OR EXISTS (
    SELECT 1 FROM jobs
    WHERE parent_batch_id = v_batch_id
      AND status IN ('processing', 'validating')
  ) THEN
    v_new_status := 'processing';
  ELSE
    v_new_status := 'queued';
  END IF;

  UPDATE job_batches
  SET completed_shards = v_completed,
      failed_shards = v_failed,
      status = v_new_status,
      updated_at = now(),
      completed_at = CASE
        WHEN v_completed + v_failed >= v_total THEN now()
        ELSE NULL
      END
  WHERE id = v_batch_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_batch_on_job_status ON jobs;
CREATE TRIGGER trg_update_batch_on_job_status
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW
  WHEN (NEW.parent_batch_id IS NOT NULL)
  EXECUTE FUNCTION update_batch_on_job_status();

-- RLS for job_batches (org-scoped reads)
ALTER TABLE job_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batch_org_read"
  ON job_batches FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
