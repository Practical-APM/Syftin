import { Suspense } from "react";
import { getEffectiveDomainsForOrg } from "@/lib/data/org-domains";
import { getSessionOrg } from "@/lib/auth/org";
import { DEMO_ORG_ID } from "@/lib/env";
import { NewExtractionForm } from "@/components/dashboard/new-extraction-form";

export default async function NewJobPage() {
  const org = await getSessionOrg();
  const orgId = org?.orgId ?? DEMO_ORG_ID;
  const domains = await getEffectiveDomainsForOrg(orgId);

  return (
    <Suspense fallback={null}>
      <NewExtractionForm domains={domains} />
    </Suspense>
  );
}
