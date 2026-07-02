-- Per-organization domain subset (must also be on global whitelist_domains)

CREATE TABLE IF NOT EXISTS organization_domains (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, domain),
  CONSTRAINT organization_domains_global_domain_fk
    FOREIGN KEY (domain) REFERENCES whitelist_domains(domain) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organization_domains_org
  ON organization_domains (organization_id);

ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_domains_member_read"
  ON organization_domains FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Enforce org subset on job insert/update (empty org list = full global whitelist)
CREATE OR REPLACE FUNCTION validate_job_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM whitelist_domains
    WHERE domain = NEW.domain AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Domain % is not on the approved whitelist', NEW.domain;
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_domains WHERE organization_id = NEW.organization_id
  ) AND NOT EXISTS (
    SELECT 1 FROM organization_domains
    WHERE organization_id = NEW.organization_id AND domain = NEW.domain
  ) THEN
    RAISE EXCEPTION 'Domain % is not enabled for this workspace', NEW.domain;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
