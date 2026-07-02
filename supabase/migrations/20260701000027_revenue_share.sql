-- Fair revenue share: contributor rewards tied to buyer job price + platform ledger

ALTER TABLE fetch_tasks
  ALTER COLUMN reward_paise SET DEFAULT 350;

ALTER TABLE contributor_earnings
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reward_tier TEXT,
  ADD COLUMN IF NOT EXISTS edge_inference BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS platform_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  buyer_charge_paise BIGINT NOT NULL DEFAULT 0,
  contributor_payout_paise BIGINT NOT NULL DEFAULT 0,
  platform_net_paise BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_ledger_org
  ON platform_ledger (organization_id, created_at DESC);

-- Credit contributor + record job_id / tier on payout
CREATE OR REPLACE FUNCTION credit_contributor_for_fetch()
RETURNS TRIGGER AS $$
DECLARE
  v_contributor_id UUID;
  v_payout BIGINT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.claimed_by_node_id IS NOT NULL THEN
    SELECT contributor_id INTO v_contributor_id
    FROM contributor_nodes WHERE id = NEW.claimed_by_node_id;

    v_payout := COALESCE(NEW.reward_paise, 0);

    IF v_contributor_id IS NOT NULL AND v_payout > 0 THEN
      INSERT INTO contributor_earnings (
        contributor_id,
        fetch_task_id,
        job_id,
        amount_paise,
        reward_tier,
        edge_inference
      )
      VALUES (
        v_contributor_id,
        NEW.id,
        NEW.job_id,
        v_payout,
        NEW.required_tier::TEXT,
        COALESCE(NEW.edge_inference, false)
      );

      UPDATE contributors
      SET balance_paise = balance_paise + v_payout,
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

-- Snapshot platform vs contributor split when a job completes
CREATE OR REPLACE FUNCTION record_platform_ledger_on_job_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_charge BIGINT := 0;
  v_contributor BIGINT := 0;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT COALESCE(ABS(amount_cents), 0) INTO v_charge
    FROM credit_transactions
    WHERE reference_id = NEW.id::TEXT
      AND kind = 'job_charge'
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT COALESCE(SUM(amount_paise), 0) INTO v_contributor
    FROM contributor_earnings
    WHERE job_id = NEW.id;

    INSERT INTO platform_ledger (
      job_id,
      organization_id,
      buyer_charge_paise,
      contributor_payout_paise,
      platform_net_paise
    )
    VALUES (
      NEW.id,
      NEW.organization_id,
      v_charge,
      v_contributor,
      GREATEST(v_charge - v_contributor, 0)
    )
    ON CONFLICT (job_id) DO UPDATE SET
      buyer_charge_paise = EXCLUDED.buyer_charge_paise,
      contributor_payout_paise = EXCLUDED.contributor_payout_paise,
      platform_net_paise = EXCLUDED.platform_net_paise;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_ledger_on_job_complete ON jobs;
CREATE TRIGGER trg_platform_ledger_on_job_complete
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION record_platform_ledger_on_job_complete();
