-- Razorpay payment orders for buyer credit top-ups

CREATE TABLE IF NOT EXISTS razorpay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'failed')),
  receipt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_razorpay_orders_org
  ON razorpay_orders (organization_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_razorpay_payment
  ON credit_transactions (reference_id)
  WHERE kind = 'deposit' AND reference_id IS NOT NULL;
