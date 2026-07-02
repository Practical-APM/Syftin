-- Pilot tenancy: org memberships, invites, job attempts, tenant RLS

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members (organization_id);

CREATE TABLE IF NOT EXISTS pilot_invites (
  email TEXT PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Seed a pilot invite for demo (optional — remove in prod)
INSERT INTO pilot_invites (email, organization_id)
VALUES ('pilot@example.com', 'a0000000-0000-4000-8000-000000000001')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_own"
  ON organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "organizations_member_read"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Replace permissive job policies with tenant-scoped policies
DROP POLICY IF EXISTS "jobs_authenticated_read" ON jobs;
DROP POLICY IF EXISTS "jobs_authenticated_insert" ON jobs;

CREATE POLICY "jobs_org_read"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "jobs_org_insert"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "jobs_org_update"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "job_runs_org_read"
  ON job_runs FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      INNER JOIN organization_members m ON m.organization_id = j.organization_id
      WHERE m.user_id = auth.uid()
    )
  );
