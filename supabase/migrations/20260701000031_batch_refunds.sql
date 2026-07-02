-- Phase 3 Sprint 4: Refund tracking for job batches

ALTER TABLE job_batches ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN NOT NULL DEFAULT false;

-- Index to quickly find batches that need refunds
CREATE INDEX IF NOT EXISTS idx_job_batches_refund_pending 
  ON job_batches (status, refund_processed, failed_shards)
  WHERE status = 'completed' AND failed_shards > 0 AND refund_processed = false;
