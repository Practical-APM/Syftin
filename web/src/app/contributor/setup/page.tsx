import { getSessionContributor } from "@/lib/auth/contributor";
import { ContributorSetupForm } from "@/components/contributor/contributor-setup-form";

export default async function ContributorSetupPage() {
  const contributor = await getSessionContributor();
  if (!contributor) return null;
  return <ContributorSetupForm contributor={contributor} />;
}
