-- RLS policies and demo seed for Phase 1

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_domains ENABLE ROW LEVEL SECURITY;

-- Public read on whitelist (for dashboard compliance page)
CREATE POLICY "whitelist_public_read"
  ON whitelist_domains FOR SELECT
  USING (is_active = true);

-- Service role bypasses RLS; anon/authenticated policies for future auth
CREATE POLICY "jobs_authenticated_read"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "jobs_authenticated_insert"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Demo organization
INSERT INTO organizations (id, name, slug, credit_balance_cents, dpa_signed_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Syftin Demo Corp',
  'syftin-demo',
  500000,
  now()
) ON CONFLICT (slug) DO NOTHING;

-- Demo jobs
INSERT INTO jobs (
  id, organization_id, name, target_url, domain, example_schema,
  status, compliance_score, record_count, completed_at
) VALUES
(
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'Blinkit Mumbai pricing',
  'https://blinkit.com',
  'blinkit.com',
  '{"product_name":"Amul Taaza Milk 1L","price_inr":56,"mrp_inr":62,"in_stock":true}'::jsonb,
  'completed', 99.20, 1240, '2026-06-28T10:45:00Z'
),
(
  'b0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Naukri React jobs',
  'https://naukri.com',
  'naukri.com',
  '{"title":"Senior Frontend Engineer","company":"Example Corp","skills":["React","TypeScript"],"posted_date":"2026-06-30"}'::jsonb,
  'processing', NULL, NULL, NULL
),
(
  'b0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000001',
  'MCA registry filings',
  'https://mca.gov.in',
  'mca.gov.in',
  '{"company_name":"Example Pvt Ltd","cin":"U12345MH2020PTC123456","filing_date":"2026-06-20","filing_type":"Annual Return"}'::jsonb,
  'completed', 98.70, 340, '2026-06-25T16:20:00Z'
) ON CONFLICT (id) DO NOTHING;

-- Auto-queue pending jobs: function to transition pending -> queued
CREATE OR REPLACE FUNCTION queue_pending_jobs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    NEW.status := 'queued';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_queue_job
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION queue_pending_jobs();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
