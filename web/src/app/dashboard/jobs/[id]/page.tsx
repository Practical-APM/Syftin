import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/sidebar";
import { JobDetailClient } from "@/components/dashboard/job-detail-client";
import { getJob } from "@/lib/data/jobs";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <>
      <DashboardHeader title={job.name} description={job.target_url} />
      <JobDetailClient initialJob={job} />
    </>
  );
}
