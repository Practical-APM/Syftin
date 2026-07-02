import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { DomainManager } from "@/components/dashboard/domain-manager";
import { getWhitelistDomains } from "@/lib/data/domains";

export default async function AdminDomainsPage() {
  const domains = await getWhitelistDomains();

  return (
    <>
      <DashboardHeader
        title="Global whitelist"
        description="Approved public domains for all pilot workspaces. Jobs targeting other sites are rejected."
      />
      <DashboardPage>
        <DomainManager initialDomains={domains} readOnly={false} />
      </DashboardPage>
    </>
  );
}
