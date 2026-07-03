import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/sidebar";
import { JobDetailClient } from "@/components/dashboard/job-detail-client";
import { getJob } from "@/lib/data/jobs";
import {
  getJobFetchProgress,
  readDistributedPagination,
} from "@/lib/data/fetch-progress";
import { isPhase2Enabled } from "@/lib/env";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const showFetchProgress =
    isPhase2Enabled() &&
    readDistributedPagination(job.example_schema) &&
    job.status !== "cancelled";

  const fetchProgress = showFetchProgress
    ? await getJobFetchProgress(id)
    : null;

  return (
    <>
      <DashboardHeader title={job.name} description={job.target_url} />
      <JobDetailClient initialJob={job} fetchProgress={fetchProgress} />
    </>
  );
}
