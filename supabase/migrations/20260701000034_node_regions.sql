-- Phase 4 Sprint 2: Geo-routing and regional compliance
-- Adds region detection to contributor nodes and region targeting to jobs.

-- ISO 3166-1 alpha-2 country codes stored as TEXT (e.g. 'IN', 'US', 'DE')
ALTER TABLE contributor_nodes
  ADD COLUMN IF NOT EXISTS region TEXT,         -- resolved from public IP at registration
  ADD COLUMN IF NOT EXISTS region_resolved_at TIMESTAMPTZ;

-- Buyers can specify a required region for their job
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS required_region TEXT;  -- NULL = any region

-- Index: fast task claiming by region
CREATE INDEX IF NOT EXISTS idx_contributor_nodes_region
  ON contributor_nodes (region) WHERE region IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_required_region
  ON jobs (required_region) WHERE required_region IS NOT NULL;

-- For fetch_tasks, propagate the region requirement from the parent job
ALTER TABLE fetch_tasks
  ADD COLUMN IF NOT EXISTS required_region TEXT;

CREATE INDEX IF NOT EXISTS idx_fetch_tasks_region
  ON fetch_tasks (required_region, status)
  WHERE required_region IS NOT NULL;
