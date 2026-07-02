import { getSessionContributor } from "@/lib/auth/contributor";
import { ContributorNetworkPanel } from "@/components/contributor/contributor-network-panel";

export default async function ContributorNetworkPage() {
  const contributor = await getSessionContributor();
  if (!contributor) return null;

  return <ContributorNetworkPanel contributor={contributor} />;
}
