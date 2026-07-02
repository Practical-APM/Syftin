-- Phase 3 Sprint 5: Consensus and Reputation

ALTER TABLE fetch_tasks 
  ADD COLUMN IF NOT EXISTS consensus_group_id UUID,
  ADD COLUMN IF NOT EXISTS is_consensus_arbiter BOOLEAN NOT NULL DEFAULT false;

-- High value tasks will share a consensus_group_id. 
-- The parent job will not complete until both tasks succeed and their outputs match.

ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER NOT NULL DEFAULT 100;

-- Simple index for priority claiming
CREATE INDEX IF NOT EXISTS idx_contributors_reputation 
  ON contributors (reputation_score DESC);

CREATE OR REPLACE FUNCTION increment_reputation(c_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE contributors
  SET reputation_score = GREATEST(0, reputation_score + amount)
  WHERE id = c_id;
END;
$$ LANGUAGE plpgsql;
