-- Syftin Phase 1 schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE job_status AS ENUM (
  'pending',
  'queued',
  'processing',
  'validating',
  'completed',
  'failed'
);

CREATE TYPE compute_tier AS ENUM ('scout', 'ranger', 'titan');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  credit_balance_cents BIGINT NOT NULL DEFAULT 0,
  dpa_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE whitelist_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  vertical TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  example_schema JSONB NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  compute_tier compute_tier NOT NULL DEFAULT 'scout',
  compliance_score NUMERIC(5,2),
  record_count INTEGER,
  variance_flags JSONB DEFAULT '[]'::jsonb,
  result_storage_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT jobs_domain_whitelist CHECK (
    domain IN (
      'amazon.in', 'flipkart.com', 'myntra.com', 'blinkit.com',
      'zeptonow.com', 'zomato.com', 'swiggy.com', 'mca.gov.in',
      'indiamart.com', 'naukri.com'
    )
  )
);

CREATE TABLE job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id TEXT,
  status job_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  raw_html_bytes INTEGER,
  parsed_output JSONB,
  compliance_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT,
  upi_vpa TEXT,
  compute_tier compute_tier NOT NULL DEFAULT 'scout',
  balance_paise BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id),
  amount_paise BIGINT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_org_status ON jobs(organization_id, status);
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at);
CREATE INDEX idx_job_runs_job ON job_runs(job_id);

-- Seed whitelist domains
INSERT INTO whitelist_domains (domain, vertical) VALUES
  ('amazon.in', 'ecommerce'),
  ('flipkart.com', 'ecommerce'),
  ('myntra.com', 'ecommerce'),
  ('blinkit.com', 'qcommerce'),
  ('zeptonow.com', 'qcommerce'),
  ('zomato.com', 'food'),
  ('swiggy.com', 'food'),
  ('mca.gov.in', 'registry'),
  ('indiamart.com', 'b2b'),
  ('naukri.com', 'jobs');

-- Whitelist validation trigger
CREATE OR REPLACE FUNCTION validate_job_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM whitelist_domains
    WHERE domain = NEW.domain AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Domain % is not on the approved whitelist', NEW.domain;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_whitelist_before_insert
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION validate_job_domain();

-- Payout trigger placeholder (Phase 2)
CREATE OR REPLACE FUNCTION check_payout_threshold()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance_paise >= 50000 THEN
    INSERT INTO payout_events (contributor_id, amount_paise, provider, status)
    VALUES (NEW.id, NEW.balance_paise, 'razorpayx', 'pending');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contributor_payout_threshold
  AFTER UPDATE OF balance_paise ON contributors
  FOR EACH ROW
  WHEN (NEW.balance_paise >= 50000 AND OLD.balance_paise < 50000)
  EXECUTE FUNCTION check_payout_threshold();
