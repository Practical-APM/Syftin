-- Remove hardcoded domain CHECK; whitelist enforced via trigger on whitelist_domains table
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_domain_whitelist;

-- Allow authenticated/service inserts into whitelist (Phase 1: service role via API)
CREATE POLICY "whitelist_service_insert"
  ON whitelist_domains FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "whitelist_service_update"
  ON whitelist_domains FOR UPDATE
  TO authenticated
  USING (true);
