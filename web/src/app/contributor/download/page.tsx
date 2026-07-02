import { Suspense } from "react";
import { ContributorInstallWizard } from "@/components/contributor/contributor-install-wizard";

export default function ContributorDownloadPage() {
  return (
    <Suspense fallback={null}>
      <ContributorInstallWizard />
    </Suspense>
  );
}
