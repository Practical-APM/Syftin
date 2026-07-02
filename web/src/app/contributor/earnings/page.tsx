import { getSessionContributor } from "@/lib/auth/contributor";
import { ContributorEarningsPanel } from "@/components/contributor/contributor-earnings-panel";

export default async function ContributorEarningsPage() {
  const contributor = await getSessionContributor();
  if (!contributor) return null;
  return <ContributorEarningsPanel contributor={contributor} />;
}
