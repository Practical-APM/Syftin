-- Worker liveness for dashboard health checks
CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fetch_mode TEXT
);

CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_seen
  ON worker_heartbeats (last_seen_at DESC);

-- Unstick demo seed job that was left in processing without a run
UPDATE jobs
SET status = 'queued', error_message = NULL
WHERE id = 'b0000000-0000-4000-8000-000000000002'
  AND status = 'processing';
