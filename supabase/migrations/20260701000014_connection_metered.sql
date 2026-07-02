-- Live metered-connection flag reported by edge node (for auto-pause)

ALTER TABLE contributor_nodes
  ADD COLUMN IF NOT EXISTS connection_metered BOOLEAN NOT NULL DEFAULT false;
