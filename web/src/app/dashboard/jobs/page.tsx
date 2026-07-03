import { Suspense } from "react";
import { getBatches } from "@/lib/data/batches";
import { getJobs } from "@/lib/data/jobs";
import { isPhase3Enabled } from "@/lib/env";
import { JobsWorkspaceClient } from "@/components/dashboard/jobs-workspace";

export default async function JobsPage() {
  const [jobs, batches] = await Promise.all([
    getJobs(),
    isPhase3Enabled() ? getBatches() : Promise.resolve([]),
  ]);

  return (
    <Suspense fallback={null}>
      <JobsWorkspaceClient initialJobs={jobs} initialBatches={batches} />
    </Suspense>
  );
}
