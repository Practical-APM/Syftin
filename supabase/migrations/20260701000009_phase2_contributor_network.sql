-- Phase 2: contributor network, fetch tasks, credits ledger

CREATE TYPE fetch_task_status AS ENUM (
  'pending',
  'claimed',
  'completed',
  'failed',
  'expired'
);

CREATE TYPE node_status AS ENUM (
  'online',
  'offline',
  'paused'
);

CREATE TYPE network_mode AS ENUM (
  'wifi',
  'metered',
  'paused'
);

-- Link contributors to Supabase auth users
ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS network_mode network_mode NOT NULL DEFAULT 'wifi',
  ADD COLUMN IF NOT EXISTS metered_pause BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS contributor_invites (
  email TEXT PRIMARY KEY,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contributor_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  machine_label TEXT NOT NULL DEFAULT 'My laptop',
  hostname TEXT,
  compute_tier compute_tier NOT NULL DEFAULT 'scout',
  status node_status NOT NULL DEFAULT 'offline',
  token_hash TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributor_nodes_contributor
  ON contributor_nodes (contributor_id);

CREATE TABLE IF NOT EXISTS fetch_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  status fetch_task_status NOT NULL DEFAULT 'pending',
  claimed_by_node_id UUID REFERENCES contributor_nodes(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  html_payload TEXT,
  html_byte_size INTEGER,
  error_message TEXT,
  reward_paise BIGINT NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fetch_tasks_status_created
  ON fetch_tasks (status, created_at);

CREATE INDEX IF NOT EXISTS idx_fetch_tasks_job
  ON fetch_tasks (job_id);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS requires_edge_fetch BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('deposit', 'job_charge', 'refund', 'adjustment')),
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_org
  ON credit_transactions (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS contributor_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  fetch_task_id UUID REFERENCES fetch_tasks(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributor_earnings_contributor
  ON contributor_earnings (contributor_id, created_at DESC);

-- When edge fetch completes, queue the job for hub LLM processing
CREATE OR REPLACE FUNCTION promote_job_after_edge_fetch()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE jobs
    SET status = 'queued', updated_at = now()
    WHERE id = NEW.job_id
      AND requires_edge_fetch = true
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fetch_task_promote_job ON fetch_tasks;
CREATE TRIGGER fetch_task_promote_job
  AFTER UPDATE OF status ON fetch_tasks
  FOR EACH ROW
  EXECUTE FUNCTION promote_job_after_edge_fetch();

-- Credit contributor balance when a fetch task completes
CREATE OR REPLACE FUNCTION credit_contributor_for_fetch()
RETURNS TRIGGER AS $$
DECLARE
  v_contributor_id UUID;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.claimed_by_node_id IS NOT NULL THEN
    SELECT contributor_id INTO v_contributor_id
    FROM contributor_nodes WHERE id = NEW.claimed_by_node_id;

    IF v_contributor_id IS NOT NULL AND NEW.reward_paise > 0 THEN
      INSERT INTO contributor_earnings (contributor_id, fetch_task_id, amount_paise)
      VALUES (v_contributor_id, NEW.id, NEW.reward_paise);

      UPDATE contributors
      SET balance_paise = balance_paise + NEW.reward_paise,
          updated_at = now()
      WHERE id = v_contributor_id;

      UPDATE contributor_nodes
      SET tasks_completed = tasks_completed + 1,
          updated_at = now()
      WHERE id = NEW.claimed_by_node_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fetch_task_credit_contributor ON fetch_tasks;
CREATE TRIGGER fetch_task_credit_contributor
  AFTER UPDATE OF status ON fetch_tasks
  FOR EACH ROW
  EXECUTE FUNCTION credit_contributor_for_fetch();

-- Keep pending jobs that need edge fetch in pending state
CREATE OR REPLACE FUNCTION queue_pending_jobs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NOT COALESCE(NEW.requires_edge_fetch, false) THEN
    NEW.status := 'queued';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS: contributors read own profile
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contributors_read_own"
  ON contributors FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "contributors_update_own"
  ON contributors FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "contributor_nodes_read_own"
  ON contributor_nodes FOR SELECT
  TO authenticated
  USING (
    contributor_id IN (
      SELECT id FROM contributors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "contributor_earnings_read_own"
  ON contributor_earnings FOR SELECT
  TO authenticated
  USING (
    contributor_id IN (
      SELECT id FROM contributors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "credit_tx_org_read"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Demo contributor invite
INSERT INTO contributor_invites (email)
VALUES ('contributor@example.com')
ON CONFLICT (email) DO NOTHING;
