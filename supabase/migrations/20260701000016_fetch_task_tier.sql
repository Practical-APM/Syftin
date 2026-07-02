-- Tier-aware edge fetch: route JS-heavy domains to Ranger+ nodes

ALTER TABLE fetch_tasks
  ADD COLUMN IF NOT EXISTS required_tier compute_tier NOT NULL DEFAULT 'scout';

CREATE INDEX IF NOT EXISTS idx_fetch_tasks_pending_tier
  ON fetch_tasks (status, required_tier, created_at);
