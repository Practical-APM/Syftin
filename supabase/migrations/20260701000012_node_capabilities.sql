-- Node capabilities: auto-detected hardware profile from edge node startup

ALTER TABLE contributor_nodes
  ADD COLUMN IF NOT EXISTS capabilities JSONB,
  ADD COLUMN IF NOT EXISTS detected_tier compute_tier,
  ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'edge_fetcher',
  ADD COLUMN IF NOT EXISTS fetch_mode TEXT,
  ADD COLUMN IF NOT EXISTS playwright_ready BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS install_version TEXT;

CREATE INDEX IF NOT EXISTS idx_contributor_nodes_detected_tier
  ON contributor_nodes (detected_tier);
