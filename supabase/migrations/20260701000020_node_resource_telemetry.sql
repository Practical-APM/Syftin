-- Live resource telemetry from edge nodes (temp, pause reason, work allowed)

ALTER TABLE contributor_nodes
  ADD COLUMN IF NOT EXISTS resource_telemetry JSONB;

CREATE INDEX IF NOT EXISTS idx_contributor_nodes_telemetry_updated
  ON contributor_nodes ((resource_telemetry->>'reported_at') DESC)
  WHERE resource_telemetry IS NOT NULL;
