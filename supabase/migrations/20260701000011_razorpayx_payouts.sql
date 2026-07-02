-- RazorpayX contributor payout tracking

ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS razorpay_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_fund_account_id TEXT;

ALTER TABLE payout_events
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payout_events_status
  ON payout_events (status, created_at DESC);

-- Avoid duplicate pending/processing payouts per contributor
CREATE OR REPLACE FUNCTION check_payout_threshold()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance_paise >= 50000 AND OLD.balance_paise < 50000 THEN
    IF NOT EXISTS (
      SELECT 1 FROM payout_events
      WHERE contributor_id = NEW.id
        AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO payout_events (contributor_id, amount_paise, provider, status)
      VALUES (NEW.id, NEW.balance_paise, 'razorpayx', 'pending');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
