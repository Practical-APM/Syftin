import Link from "next/link";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { WorkspaceDomainList } from "@/components/dashboard/workspace-domain-list";
import { getWhitelistDomains } from "@/lib/data/domains";
import { getOrgDomainEditorState } from "@/lib/data/org-domains";
import { getSessionOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { canManageWhitelist } from "@/lib/env";

export default async function CompliancePage() {
  const org = await getSessionOrg();
  const orgId = org?.orgId ?? "";
  const [globalDomains, orgState] = await Promise.all([
    getWhitelistDomains(),
    orgId ? getOrgDomainEditorState(orgId) : Promise.resolve(null),
  ]);

  const effectiveEntries =
    orgState && orgState.usesSubset
      ? globalDomains.filter(
          (d) => d.is_active && orgState.orgDomains.includes(d.domain),
        )
      : globalDomains.filter((d) => d.is_active);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const platformAdmin = canManageWhitelist() || isPlatformAdminEmail(user?.email);
  const readOnly = !platformAdmin;

  return (
    <>
      <DashboardHeader
        title="Approved sites"
        description={
          readOnly
            ? "Domains your team can target when creating jobs."
            : undefined
        }
      />
      <DashboardPage>
        {!readOnly && (
          <Panel padding="md" className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-graphite-600">
              Global whitelist editing lives in the admin console.
            </p>
            <Link
              href="/admin/domains"
              className="text-sm font-medium text-honey-600 hover:text-honey-500"
            >
              Open whitelist editor →
            </Link>
          </Panel>
        )}

        <Panel>
          <h2 className="text-sm font-semibold text-graphite-900">
            {readOnly ? "Your workspace sites" : "Active domains"}
          </h2>
          <div className="mt-4">
            <WorkspaceDomainList
              domains={readOnly ? effectiveEntries : globalDomains.filter((d) => d.is_active)}
              usesSubset={orgState?.usesSubset ?? false}
            />
          </div>
        </Panel>
      </DashboardPage>
    </>
  );
}
