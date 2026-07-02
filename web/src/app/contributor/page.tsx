import {
  listContributorEarnings,
  listContributorNodes,
} from "@/lib/data/contributors";
import { getSessionContributor } from "@/lib/auth/contributor";
import { ContributorOverviewClient } from "@/components/contributor/contributor-overview";
import { isSupabaseConfigured } from "@/lib/env";

export default async function ContributorPage() {
  const contributor = await getSessionContributor();
  if (!contributor) return null;

  const useSupabase = isSupabaseConfigured();
  const nodes = await listContributorNodes(contributor, useSupabase);
  const earnings = await listContributorEarnings(contributor, useSupabase);
  const dayAgo = Date.now() - 86400000;
  const recentEarningsPaise = earnings
    .filter((e) => new Date(e.created_at).getTime() > dayAgo)
    .reduce((s, e) => s + e.amount_paise, 0);

  return (
    <ContributorOverviewClient
      initial={{
        contributor,
        nodesOnline: nodes.filter((n) => n.status === "online").length,
        nodesTotal: nodes.length,
        recentEarningsPaise,
        hasOnlineNode: nodes.some((n) => n.status === "online"),
      }}
    />
  );
}
