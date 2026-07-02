import { JobsPageShell } from "@/components/dashboard/jobs-list";
import { getJobs } from "@/lib/data/jobs";

export default async function JobsPage() {
  const jobs = await getJobs();
  return <JobsPageShell initialJobs={jobs} />;
}
